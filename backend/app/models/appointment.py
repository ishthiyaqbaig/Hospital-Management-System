from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.common import TimestampedResponse

AppointmentStatus = Literal["scheduled", "checked_in", "completed", "cancelled"]
QueueStatus = Literal["waiting", "in-progress", "done"]


class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    department_id: str | None = None
    scheduled_at: datetime
    reason: str | None = Field(default=None, max_length=500)
    status: AppointmentStatus = "scheduled"
    notes: str | None = Field(default=None, max_length=1000)
    queue_position: int | None = Field(default=None, ge=1)
    queue_status: QueueStatus = "waiting"


class AppointmentBookingCreate(BaseModel):
    patient_id: str
    doctor_id: str
    department_id: str | None = None
    scheduled_at: datetime
    reason: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)


class AppointmentUpdate(BaseModel):
    patient_id: str | None = None
    doctor_id: str | None = None
    department_id: str | None = None
    scheduled_at: datetime | None = None
    reason: str | None = Field(default=None, max_length=500)
    status: AppointmentStatus | None = None
    notes: str | None = Field(default=None, max_length=1000)
    queue_position: int | None = Field(default=None, ge=1)
    queue_status: QueueStatus | None = None


class QueueStatusUpdate(BaseModel):
    queue_status: QueueStatus


class AppointmentResponse(TimestampedResponse, AppointmentCreate):
    patient_name: str | None = None
    doctor_name: str | None = None
