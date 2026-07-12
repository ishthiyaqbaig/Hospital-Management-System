import json
from datetime import datetime, timezone
from typing import Any

from app.models.chat import ChatRequest
from app.models.user import UserInDB
from app.services.ai_service import AIServiceError, generate_json_response
from app.services.database import get_database

CHAT_HISTORY = "chat_history"


async def answer_patient_chat(payload: ChatRequest, patient: UserInDB) -> dict[str, Any]:
    context = await _patient_context(patient)
    prompt = _chat_prompt(payload.message, context)
    try:
        output = await generate_json_response(
            prompt,
            {
                "type": "object",
                "properties": {
                    "answer": {"type": "string"},
                    "handoff_required": {"type": "boolean"},
                },
                "required": ["answer", "handoff_required"],
            },
        )
        answer = str(output.get("answer") or "").strip()
        if not answer:
            raise AIServiceError("Gemini chat response did not include an answer")
        handoff_required = bool(output.get("handoff_required", False))
    except AIServiceError:
        answer = "I could not answer right now. Please contact the hospital desk or consult your doctor."
        handoff_required = True

    now = datetime.now(timezone.utc)
    document = {
        "user_id": patient.id,
        "patient_id": context["patient_id"],
        "message": payload.message,
        "answer": answer,
        "handoff_required": handoff_required,
        "created_at": now,
    }
    result = await get_database()[CHAT_HISTORY].insert_one(document)
    return {
        "id": str(result.inserted_id),
        "message": payload.message,
        "answer": answer,
        "handoff_required": handoff_required,
        "created_at": now,
    }


async def _patient_context(patient: UserInDB) -> dict[str, Any]:
    db = get_database()
    patient_record = await db["patients"].find_one({"email": str(patient.email).lower()})
    patient_id = str(patient_record["_id"]) if patient_record else patient.id
    patient_ids = [patient.id, patient_id]
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    appointments_cursor = (
        db["appointments"]
        .find(
            {
                "patient_id": {"$in": patient_ids},
                "scheduled_at": {"$gte": now},
                "status": {"$ne": "cancelled"},
            },
            {
                "_id": 0,
                "scheduled_at": 1,
                "doctor_id": 1,
                "department_id": 1,
                "status": 1,
                "queue_position": 1,
            },
        )
        .sort("scheduled_at", 1)
        .limit(5)
    )
    prescriptions_cursor = (
        db["prescriptions"]
        .find(
            {"patient_id": {"$in": patient_ids}},
            {
                "_id": 0,
                "created_at": 1,
                "doctor_id": 1,
                "medications": 1,
                "instructions": 1,
                "status": 1,
            },
        )
        .sort("created_at", -1)
        .limit(5)
    )

    return {
        "patient_id": patient_id,
        "name": patient_record.get("name", patient.name) if patient_record else patient.name,
        "upcoming_appointments": await appointments_cursor.to_list(length=5),
        "recent_prescriptions": await prescriptions_cursor.to_list(length=5),
    }


def _chat_prompt(message: str, context: dict[str, Any]) -> str:
    allowed_context = {
        "name": context["name"],
        "upcoming_appointments": context["upcoming_appointments"],
        "recent_prescriptions": context["recent_prescriptions"],
    }
    return "\n".join(
        [
            "System: MediFlow patient chat.",
            "Return: JSON only",
            "Keys: answer,handoff_required",
            "Rules:",
            "- hospital-related Q&A only",
            "- use only provided context",
            "- no diagnosis",
            "- no treatment advice",
            '- medical questions: say "Please consult your doctor."',
            "- concise answer",
            f"Context: {json.dumps(allowed_context, default=str, separators=(',', ':'))}",
            f"Patient message: {message}",
        ]
    )
