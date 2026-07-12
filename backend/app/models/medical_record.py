from pydantic import BaseModel, Field

from app.models.common import TimestampedResponse


class MedicalRecordCreate(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_id: str | None = None
    diagnosis: str = Field(min_length=2, max_length=500)
    symptoms: list[str] = Field(default_factory=list)
    notes: str | None = Field(default=None, max_length=2000)
    attachments: list[str] = Field(default_factory=list)


class MedicalRecordUpdate(BaseModel):
    patient_id: str | None = None
    doctor_id: str | None = None
    appointment_id: str | None = None
    diagnosis: str | None = Field(default=None, min_length=2, max_length=500)
    symptoms: list[str] | None = None
    notes: str | None = Field(default=None, max_length=2000)
    attachments: list[str] | None = None


class MedicalRecordResponse(TimestampedResponse, MedicalRecordCreate):
    pass
