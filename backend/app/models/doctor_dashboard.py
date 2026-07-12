from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.appointment import AppointmentResponse
from app.models.medical_record import MedicalRecordResponse
from app.models.patient import PatientResponse


class DoctorAppointmentRow(AppointmentResponse):
    patient_name: str | None = None


class DoctorTodayResponse(BaseModel):
    doctor_id: str
    appointments: list[DoctorAppointmentRow]


class PatientRecordHistoryResponse(BaseModel):
    patient: PatientResponse | None = None
    records: list[MedicalRecordResponse]


class PatientSummaryResponse(BaseModel):
    report_id: str
    generated_at: datetime
    summary: dict[str, Any]
