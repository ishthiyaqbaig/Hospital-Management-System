from typing import Literal

from pydantic import BaseModel, Field

from app.models.common import TimestampedResponse

PrescriptionStatus = Literal["active", "completed", "cancelled"]


class Medication(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    dosage: str = Field(min_length=1, max_length=80)
    frequency: str = Field(min_length=1, max_length=80)
    duration: str | None = Field(default=None, max_length=80)


class PrescriptionCreate(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_id: str | None = None
    medications: list[Medication] = Field(min_length=1)
    instructions: str | None = Field(default=None, max_length=1000)
    status: PrescriptionStatus = "active"


class PrescriptionUpdate(BaseModel):
    patient_id: str | None = None
    doctor_id: str | None = None
    appointment_id: str | None = None
    medications: list[Medication] | None = None
    instructions: str | None = Field(default=None, max_length=1000)
    status: PrescriptionStatus | None = None


class PrescriptionResponse(TimestampedResponse, PrescriptionCreate):
    doctor_name: str | None = None
