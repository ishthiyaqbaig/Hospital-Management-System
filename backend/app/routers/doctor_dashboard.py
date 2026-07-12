from fastapi import APIRouter, Depends

from app.models.doctor_dashboard import (
    DoctorTodayResponse,
    PatientRecordHistoryResponse,
    PatientSummaryResponse,
)
from app.models.user import UserInDB
from app.services.doctor_dashboard import (
    patient_ai_summary,
    patient_record_history,
    todays_appointments,
)
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/doctor-dashboard", tags=["Doctor Dashboard"])


@router.get("/today", response_model=DoctorTodayResponse)
async def get_today(user: UserInDB = Depends(require_roles("doctor"))):
    return await todays_appointments(user)


@router.get("/patients/{patient_id}/records", response_model=PatientRecordHistoryResponse)
async def get_patient_records(
    patient_id: str,
    _: UserInDB = Depends(require_roles("doctor")),
):
    return await patient_record_history(patient_id)


@router.post("/patients/{patient_id}/summary", response_model=PatientSummaryResponse)
async def summarize_records(
    patient_id: str,
    _: UserInDB = Depends(require_roles("doctor")),
):
    return await patient_ai_summary(patient_id)
