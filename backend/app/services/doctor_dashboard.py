from datetime import datetime, time
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.models.user import UserInDB
from app.services.ai_service import summarize_patient_history
from app.services.crud import serialize_document
from app.services.database import get_database


async def todays_appointments(user: UserInDB) -> dict[str, Any]:
    doctor_id = await _doctor_id_for_user(user)
    cursor = (
        get_database()["appointments"]
        .find({"doctor_id": doctor_id, "status": {"$ne": "cancelled"}})
        .sort("scheduled_at", 1)
    )
    appointments = [serialize_document(item) for item in await cursor.to_list(length=100)]
    patient_names = await _patient_names([item["patient_id"] for item in appointments])
    for item in appointments:
        item["patient_name"] = patient_names.get(item["patient_id"])
    return {"doctor_id": doctor_id, "appointments": appointments}


async def patient_record_history(patient_id: str) -> dict[str, Any]:
    db = get_database()
    patient = await _find_patient(patient_id)
    cursor = (
        db["medical_records"]
        .find({"patient_id": patient_id})
        .sort("created_at", -1)
        .limit(25)
    )
    return {
        "patient": serialize_document(patient) if patient else None,
        "records": [serialize_document(record) for record in await cursor.to_list(length=25)],
    }


async def patient_ai_summary(patient_id: str) -> dict[str, Any]:
    history = await patient_record_history(patient_id)
    result = await summarize_patient_history(history["records"])
    return {
        "report_id": result["report_id"],
        "generated_at": datetime.now(),
        "summary": result["output"],
    }


async def _doctor_id_for_user(user: UserInDB) -> str:
    doctor = await get_database()["doctors"].find_one({"email": str(user.email).lower()})
    if doctor:
        return str(doctor["_id"])
    raise HTTPException(
        status.HTTP_404_NOT_FOUND,
        "Doctor profile not found for current user",
    )


async def _find_patient(patient_id: str) -> dict[str, Any] | None:
    query: dict[str, Any] = {"_id": _object_id(patient_id)} if _is_object_id(patient_id) else {"_id": patient_id}
    return await get_database()["patients"].find_one(query)


async def _patient_names(patient_ids: list[str]) -> dict[str, str]:
    object_ids = [_object_id(value) for value in patient_ids if _is_object_id(value)]
    if not object_ids:
        return {}
    cursor = get_database()["patients"].find({"_id": {"$in": object_ids}}, {"name": 1})
    patients = await cursor.to_list(length=len(object_ids))
    return {str(patient["_id"]): patient.get("name", "Unknown patient") for patient in patients}


def _is_object_id(value: str) -> bool:
    try:
        ObjectId(value)
        return True
    except InvalidId:
        return False


def _object_id(value: str) -> ObjectId:
    return ObjectId(value)
