from datetime import datetime, time, timezone
from typing import Any

from fastapi import HTTPException, status

from app.models.appointment import AppointmentBookingCreate, AppointmentUpdate, QueueStatusUpdate
from app.models.common import PaginationParams
from app.models.user import UserInDB
from app.services import billing as billing_service
from app.services.ai_service import prioritize_emergency
from app.services.crud import get_document, serialize_document, update_document
from app.services.database import get_database

APPOINTMENTS = "appointments"
DOCTORS = "doctors"
ACTIVE_STATUSES = {"scheduled", "checked_in"}
WEEKDAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


def _as_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _parse_time(value: str) -> time:
    return time.fromisoformat(value.strip())


def _matches_availability(slot: datetime, rules: list[str]) -> bool:
    if not rules:
        return True
    weekday = WEEKDAYS[slot.weekday()]
    slot_time = slot.time()

    for raw_rule in rules:
        rule = raw_rule.strip().lower()
        if rule == weekday:
            return True
        if ":" in rule and rule.split(":", 1)[0] == weekday:
            window = rule.split(":", 1)[1]
        elif "-" in rule:
            window = rule
        else:
            continue
        try:
            start_raw, end_raw = window.split("-", 1)
            if _parse_time(start_raw) <= slot_time <= _parse_time(end_raw):
                return True
        except ValueError:
            continue
    return False


async def _get_doctor(doctor_id: str) -> dict[str, Any]:
    return await get_document(DOCTORS, doctor_id)


async def _ensure_slot_available(doctor_id: str, scheduled_at: datetime) -> None:
    conflict = await get_database()[APPOINTMENTS].find_one(
        {
            "doctor_id": doctor_id,
            "scheduled_at": scheduled_at,
            "status": {"$in": list(ACTIVE_STATUSES)},
        }
    )
    if conflict:
        raise HTTPException(status.HTTP_409_CONFLICT, "Doctor is already booked for this slot")


async def _next_queue_position(department_id: str, scheduled_at: datetime) -> int:
    day_start = scheduled_at.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = scheduled_at.replace(hour=23, minute=59, second=59, microsecond=999999)
    count = await get_database()[APPOINTMENTS].count_documents(
        {
            "department_id": department_id,
            "scheduled_at": {"$gte": day_start, "$lte": day_end},
            "status": {"$ne": "cancelled"},
        }
    )
    return count + 1


async def book_appointment(payload: AppointmentBookingCreate) -> dict[str, Any]:
    scheduled_at = _as_datetime(payload.scheduled_at)
    doctor = await _get_doctor(payload.doctor_id)
    department_id = payload.department_id or doctor.get("department_id")
    if not department_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Appointment needs a department")
    if not _matches_availability(scheduled_at, doctor.get("availability", [])):
        raise HTTPException(status.HTTP_409_CONFLICT, "Doctor is unavailable for this slot")

    await _ensure_slot_available(payload.doctor_id, scheduled_at)
    queue_position = await _next_queue_position(department_id, scheduled_at)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    document = {
        **payload.model_dump(exclude_none=True),
        "department_id": department_id,
        "scheduled_at": scheduled_at,
        "status": "scheduled",
        "queue_status": "waiting",
        "queue_position": queue_position,
        "created_at": now,
        "updated_at": now,
    }
    result = await get_database()[APPOINTMENTS].insert_one(document)
    document["_id"] = result.inserted_id

    # Create notifications
    await get_database()["notifications"].insert_many([
        {
            "user_id": payload.patient_id,
            "title": "Appointment Booked",
            "message": f"Your appointment with doctor has been booked for {scheduled_at.strftime('%Y-%m-%d %H:%M')}.",
            "type": "info",
            "is_read": False,
            "created_at": now,
            "updated_at": now,
        },
        {
            "user_id": payload.doctor_id,
            "title": "New Appointment Scheduled",
            "message": f"A patient has scheduled an appointment with you for {scheduled_at.strftime('%Y-%m-%d %H:%M')}.",
            "type": "reminder",
            "is_read": False,
            "created_at": now,
            "updated_at": now,
        }
    ])

    return serialize_document(document)


def assign_queue_positions(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        items,
        key=lambda item: (
            -(int(item.get("emergency_urgency") or 0)),
            item.get("scheduled_at") or datetime.min,
            int(item.get("queue_position") or 999999),
        ),
    )


async def fetch_department_queue(
    department_id: str,
    pagination: PaginationParams,
) -> dict[str, Any]:
    query = {"department_id": department_id, "queue_status": {"$in": ["waiting", "in-progress"]}}
    collection = get_database()[APPOINTMENTS]
    skip = (pagination.page - 1) * pagination.page_size
    cursor = (
        collection.find(query)
        .sort([("queue_position", 1), ("scheduled_at", 1)])
        .skip(skip)
        .limit(pagination.page_size)
    )
    documents = [serialize_document(document) for document in await cursor.to_list(length=pagination.page_size)]
    ordered = assign_queue_positions(documents)
    return {
        "items": ordered,
        "total": await collection.count_documents(query),
        "page": pagination.page,
        "page_size": pagination.page_size,
    }


async def update_appointment_record(appointment_id: str, payload: AppointmentUpdate) -> dict[str, Any]:
    existing = await get_document(APPOINTMENTS, appointment_id)
    updated = await update_document(APPOINTMENTS, appointment_id, payload)
    if existing.get("status") != "completed" and payload.status == "completed":
        await billing_service.generate_billing_from_appointment(appointment_id)
    return updated


async def update_queue_status(appointment_id: str, payload: QueueStatusUpdate) -> dict[str, Any]:
    return await update_document(APPOINTMENTS, appointment_id, payload)


async def create_emergency_intake(payload: dict[str, Any]) -> dict[str, Any]:
    triage = await prioritize_emergency(
        f"Symptoms: {payload.get('symptoms', '')}. Vitals: {payload.get('vitals', '')}."
    )
    output = triage.get("output", {})
    urgency_score = int(round(float(output.get("urgency_score", 1))))
    urgency_score = max(1, min(5, urgency_score))
    reasoning = str(output.get("reasoning", "Triage completed")).strip() or "Triage completed"

    patient_id = str(payload.get("patient_id"))
    doctor_id = str(payload.get("doctor_id"))
    department_id = str(payload.get("department_id") or "")
    scheduled_at = payload.get("scheduled_at") or datetime.now(timezone.utc).replace(tzinfo=None)
    queue_position = await _next_queue_position(department_id, scheduled_at)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    document = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "department_id": department_id,
        "scheduled_at": scheduled_at,
        "reason": payload.get("symptoms", "Emergency intake"),
        "status": "scheduled",
        "queue_status": "waiting",
        "queue_position": queue_position,
        "emergency_urgency": urgency_score,
        "emergency_reasoning": reasoning,
        "notes": payload.get("vitals", ""),
        "created_at": now,
        "updated_at": now,
    }
    result = await get_database()[APPOINTMENTS].insert_one(document)
    document["_id"] = result.inserted_id

    # Create notifications
    await get_database()["notifications"].insert_many([
        {
            "user_id": patient_id,
            "title": "Emergency Intake Registered",
            "message": f"Your front-desk emergency triage intake has been registered. Triage Urgency: {urgency_score}/5.",
            "type": "lab",
            "is_read": False,
            "created_at": now,
            "updated_at": now,
        },
        {
            "user_id": doctor_id,
            "title": "Emergency Patient Assigned",
            "message": f"An emergency triage patient has been queued for you. Urgency Score: {urgency_score}/5.",
            "type": "reminder",
            "is_read": False,
            "created_at": now,
            "updated_at": now,
        }
    ])

    return serialize_document(document)


async def list_appointments_for_user(
    current_user: UserInDB,
    pagination: PaginationParams,
    patient_id: str | None = None,
    doctor_id: str | None = None,
) -> dict[str, Any]:
    from bson import ObjectId
    from bson.errors import InvalidId

    def is_obj_id(value: str) -> bool:
        try:
            ObjectId(value)
            return True
        except InvalidId:
            return False

    db = get_database()
    query = {}

    if current_user.role == "patient":
        query["patient_id"] = str(current_user.id)
    elif current_user.role == "doctor":
        doctor = await db["doctors"].find_one({"email": str(current_user.email).lower()})
        if doctor:
            query["doctor_id"] = str(doctor["_id"])
        else:
            query["doctor_id"] = "nonexistent"
    else:
        if patient_id:
            query["patient_id"] = patient_id
        if doctor_id:
            query["doctor_id"] = doctor_id

    skip = (pagination.page - 1) * pagination.page_size
    cursor = db[APPOINTMENTS].find(query).sort("scheduled_at", -1).skip(skip).limit(pagination.page_size)
    documents = await cursor.to_list(length=pagination.page_size)
    total = await db[APPOINTMENTS].count_documents(query)

    items = []
    for doc in documents:
        item = serialize_document(doc)
        
        p_id = item.get("patient_id")
        if p_id:
            p_query = {"_id": ObjectId(p_id)} if is_obj_id(p_id) else {"_id": p_id}
            patient = await db["patients"].find_one(p_query)
            item["patient_name"] = patient.get("name", "Unknown patient") if patient else "Unknown patient"
        else:
            item["patient_name"] = "Unknown patient"

        d_id = item.get("doctor_id")
        if d_id:
            d_query = {"_id": ObjectId(d_id)} if is_obj_id(d_id) else {"_id": d_id}
            doctor = await db["doctors"].find_one(d_query)
            item["doctor_name"] = doctor.get("name", "Unknown doctor") if doctor else "Unknown doctor"
        else:
            item["doctor_name"] = "Unknown doctor"
        
        items.append(item)

    return {
        "items": items,
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
    }

