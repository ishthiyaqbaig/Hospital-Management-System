from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.appointment import (
    AppointmentBookingCreate,
    AppointmentResponse,
    AppointmentUpdate,
    QueueStatusUpdate,
)
from app.models.common import PaginatedResponse, PaginationParams
from app.models.user import UserInDB
from app.services import appointments, crud
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/appointments", tags=["Appointments"])
COLLECTION = "appointments"
CARE_TEAM = ("admin", "doctor", "receptionist", "patient")
QUEUE_TEAM = ("admin", "doctor", "receptionist")


class EmergencyIntakePayload(BaseModel):
    patient_id: str
    doctor_id: str
    department_id: str | None = None
    symptoms: str = Field(min_length=1, max_length=1000)
    vitals: str | None = Field(default=None, max_length=1000)
    scheduled_at: str | None = None


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("patient", "receptionist", "doctor", "admin"))],
)
async def create_appointment(payload: AppointmentBookingCreate):
    return await appointments.book_appointment(payload)


@router.post(
    "/book",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("patient", "receptionist", "doctor", "admin"))],
)
async def book_appointment(payload: AppointmentBookingCreate):
    return await appointments.book_appointment(payload)


@router.post(
    "/emergency-intake",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("receptionist"))],
)
async def emergency_intake(payload: EmergencyIntakePayload):
    return await appointments.create_emergency_intake(payload.model_dump())


@router.get(
    "",
    response_model=PaginatedResponse[AppointmentResponse],
)
async def list_appointments(
    pagination: PaginationParams = Depends(),
    current_user: UserInDB = Depends(get_current_user),
    patient_id: str | None = None,
    doctor_id: str | None = None,
):
    if current_user.role not in CARE_TEAM:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )
    return await appointments.list_appointments_for_user(
        current_user=current_user,
        pagination=pagination,
        patient_id=patient_id,
        doctor_id=doctor_id,
    )


@router.get(
    "/queue/{department_id}",
    response_model=PaginatedResponse[AppointmentResponse],
    dependencies=[Depends(require_roles(*QUEUE_TEAM))],
)
async def get_department_queue(
    department_id: str,
    pagination: PaginationParams = Depends(),
):
    return await appointments.fetch_department_queue(department_id, pagination)


@router.patch(
    "/{appointment_id}/queue-status",
    response_model=AppointmentResponse,
    dependencies=[Depends(require_roles("doctor", "receptionist"))],
)
async def update_queue_status(appointment_id: str, payload: QueueStatusUpdate):
    return await appointments.update_queue_status(appointment_id, payload)


@router.get(
    "/{appointment_id}",
    response_model=AppointmentResponse,
    dependencies=[Depends(require_roles(*CARE_TEAM))],
)
async def get_appointment(appointment_id: str):
    return await crud.get_document(COLLECTION, appointment_id)


@router.patch(
    "/{appointment_id}",
    response_model=AppointmentResponse,
    dependencies=[Depends(require_roles("admin", "receptionist", "doctor"))],
)
async def update_appointment(appointment_id: str, payload: AppointmentUpdate):
    return await appointments.update_appointment_record(appointment_id, payload)


@router.delete(
    "/{appointment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin", "receptionist"))],
)
async def delete_appointment(appointment_id: str):
    await crud.delete_document(COLLECTION, appointment_id)
