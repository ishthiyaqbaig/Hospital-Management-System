from fastapi import APIRouter, Depends, status

from app.models.common import PaginatedResponse, PaginationParams
from app.models.doctor import DoctorCreate, DoctorResponse, DoctorUpdate
from app.services import crud
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/doctors", tags=["Doctors"])
COLLECTION = "doctors"
ALL_ROLES = ("admin", "doctor", "receptionist", "patient")


@router.post(
    "",
    response_model=DoctorResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin"))],
)
async def create_doctor(payload: DoctorCreate):
    return await crud.create_document(COLLECTION, payload)


@router.get(
    "",
    response_model=PaginatedResponse[DoctorResponse],
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def list_doctors(pagination: PaginationParams = Depends()):
    return await crud.list_documents(COLLECTION, pagination)


@router.get(
    "/{doctor_id}",
    response_model=DoctorResponse,
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def get_doctor(doctor_id: str):
    return await crud.get_document(COLLECTION, doctor_id)


@router.patch(
    "/{doctor_id}",
    response_model=DoctorResponse,
    dependencies=[Depends(require_roles("admin"))],
)
async def update_doctor(doctor_id: str, payload: DoctorUpdate):
    return await crud.update_document(COLLECTION, doctor_id, payload)


@router.delete(
    "/{doctor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
async def delete_doctor(doctor_id: str):
    await crud.delete_document(COLLECTION, doctor_id)
