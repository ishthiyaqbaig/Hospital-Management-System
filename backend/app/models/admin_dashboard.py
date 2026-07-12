from typing import Any

from pydantic import BaseModel


class AdminAnalyticsResponse(BaseModel):
    patient_volume: list[dict[str, Any]]
    doctor_utilization: list[dict[str, Any]]
    department_load: list[dict[str, Any]]
    average_wait_time: list[dict[str, Any]]
    revenue: list[dict[str, Any]]
    totals: dict[str, Any]


class AdminReportResponse(BaseModel):
    report_id: str
    report: dict[str, Any]
    stats: AdminAnalyticsResponse
