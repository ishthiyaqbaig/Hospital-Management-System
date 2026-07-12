import asyncio
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

from app.services.database import connect_database, get_database
from app.services.users import create_user
from app.models.user import UserCreate

load_dotenv()


async def seed_demo_data() -> None:
    await connect_database()
    db = get_database()
    await db.drop_collection("users")
    await db.drop_collection("departments")
    await db.drop_collection("doctors")
    await db.drop_collection("appointments")
    await db.drop_collection("billing")
    await db.drop_collection("prescriptions")
    await db.drop_collection("patients")
    await db.drop_collection("medical_records")
    await db.drop_collection("ai_reports")
    await db.drop_collection("chat_history")

    await create_user(
        UserCreate(
            name="Admin User",
            email="admin@mediflow.ai",
            password="Admin1234",
            role="admin",
            phone="555-0100",
        )
    )
    await create_user(
        UserCreate(
            name="Dr. Maya Patel",
            email="doctor@mediflow.ai",
            password="Doctor1234",
            role="doctor",
            phone="555-0101",
        )
    )
    await create_user(
        UserCreate(
            name="Reception Desk",
            email="reception@mediflow.ai",
            password="Reception1234",
            role="receptionist",
            phone="555-0102",
        )
    )
    await create_user(
        UserCreate(
            name="Sam Patient",
            email="patient@mediflow.ai",
            password="Patient1234",
            role="patient",
            phone="555-0103",
        )
    )

    departments = [
        {
            "name": "Emergency",
            "description": "Urgent care",
            "location": "Floor 1",
            "phone": "555-1000",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "name": "General Medicine",
            "description": "Primary care",
            "location": "Floor 2",
            "phone": "555-1001",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
    ]
    result = await db.departments.insert_many(departments)
    dept_ids = result.inserted_ids

    # Update Dr. Maya Patel's department and specialization
    await db.doctors.update_one(
        {"email": "doctor@mediflow.ai"},
        {
            "$set": {
                "specialization": "Internal Medicine",
                "department_id": str(dept_ids[1]),
                "license_number": "LIC-1001",
            }
        }
    )

    print("Demo data seeded successfully")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
