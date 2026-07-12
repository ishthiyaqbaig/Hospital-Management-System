from datetime import datetime, timezone
from typing import Any

from pymongo import ASCENDING

from app.models.user import UserCreate, UserInDB
from app.services.database import get_database
from app.utils.security import hash_password

USERS_COLLECTION = "users"


async def ensure_user_indexes() -> None:
    await get_database()[USERS_COLLECTION].create_index(
        [("email", ASCENDING)],
        unique=True,
    )


def serialize_user(document: dict[str, Any]) -> UserInDB:
    if "name" not in document:
        document = dict(document)
        document["name"] = document.get("name") or "User"
    if "email" not in document:
        document = dict(document)
        document["email"] = ""
    if "password_hash" not in document:
        document = dict(document)
        document["password_hash"] = ""
    if "role" not in document:
        document = dict(document)
        document["role"] = "patient"
    if "created_at" not in document:
        document = dict(document)
        document["created_at"] = datetime.now(timezone.utc)
    return UserInDB(
        id=str(document["_id"]),
        name=str(document.get("name", "User")),
        email=str(document.get("email", "")),
        password_hash=str(document.get("password_hash", "")),
        role=str(document.get("role", "patient")),
        phone=document.get("phone"),
        created_at=document["created_at"],
    )


async def get_user_by_email(email: str) -> UserInDB | None:
    document = await get_database()[USERS_COLLECTION].find_one(
        {"email": email.lower().strip()}
    )
    if document is None:
        return None
    return serialize_user(document)


async def create_user(payload: UserCreate) -> UserInDB:
    db = get_database()
    now = datetime.now(timezone.utc)
    document = {
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "phone": payload.phone.strip() if payload.phone else None,
        "created_at": now,
    }
    result = await db[USERS_COLLECTION].insert_one(document)
    user_id = result.inserted_id
    document["_id"] = user_id

    if payload.role == "patient":
        patient_doc = {
            "_id": user_id,
            "name": payload.name.strip(),
            "email": payload.email.lower().strip(),
            "phone": payload.phone.strip() if payload.phone else None,
            "date_of_birth": None,
            "gender": "unknown",
            "address": None,
            "emergency_contact": None,
            "created_at": now,
            "updated_at": now,
        }
        await db["patients"].insert_one(patient_doc)

    elif payload.role == "doctor":
        dept = await db["departments"].find_one({"name": "General Medicine"})
        if not dept:
            dept = await db["departments"].find_one()
        dept_id = str(dept["_id"]) if dept else None

        doctor_doc = {
            "_id": user_id,
            "name": payload.name.strip(),
            "email": payload.email.lower().strip(),
            "phone": payload.phone.strip() if payload.phone else None,
            "department_id": dept_id,
            "specialization": "General Medicine",
            "license_number": f"LIC-{str(user_id)[-6:]}",
            "availability": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "created_at": now,
            "updated_at": now,
        }
        await db["doctors"].insert_one(doctor_doc)

    return serialize_user(document)

