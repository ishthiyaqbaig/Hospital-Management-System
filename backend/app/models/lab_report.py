from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.common import TimestampedResponse

LabReportStatus = Literal["pending", "completed", "reviewed"]


class LabReportCreate(BaseModel):
    patient_id: str
    doctor_id: str
    test_name: str = Field(min_length=2, max_length=160)
    result_summary: str | None = Field(default=None, max_length=2000)
    report_url: str | None = Field(default=None, max_length=500)
    status: LabReportStatus = "pending"
    ordered_at: datetime | None = None
    completed_at: datetime | None = None


class LabReportUpdate(BaseModel):
    patient_id: str | None = None
    doctor_id: str | None = None
    test_name: str | None = Field(default=None, min_length=2, max_length=160)
    result_summary: str | None = Field(default=None, max_length=2000)
    report_url: str | None = Field(default=None, max_length=500)
    status: LabReportStatus | None = None
    ordered_at: datetime | None = None
    completed_at: datetime | None = None


class LabReportResponse(TimestampedResponse, LabReportCreate):
    pass
