from fastapi import APIRouter, Depends, status

from app.models.common import PaginatedResponse, PaginationParams
from app.models.patient import PatientCreate, PatientResponse, PatientUpdate
from app.services import crud
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/patients", tags=["Patients"])
COLLECTION = "patients"
STAFF = ("admin", "doctor", "receptionist")


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "receptionist"))],
)
async def create_patient(payload: PatientCreate):
    return await crud.create_document(COLLECTION, payload)


@router.get(
    "",
    response_model=PaginatedResponse[PatientResponse],
    dependencies=[Depends(require_roles(*STAFF))],
)
async def list_patients(pagination: PaginationParams = Depends()):
    return await crud.list_documents(COLLECTION, pagination)


@router.get(
    "/{patient_id}",
    response_model=PatientResponse,
    dependencies=[Depends(require_roles(*STAFF))],
)
async def get_patient(patient_id: str):
    return await crud.get_document(COLLECTION, patient_id)


@router.patch(
    "/{patient_id}",
    response_model=PatientResponse,
    dependencies=[Depends(require_roles("admin", "receptionist"))],
)
async def update_patient(patient_id: str, payload: PatientUpdate):
    return await crud.update_document(COLLECTION, patient_id, payload)


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
async def delete_patient(patient_id: str):
    await crud.delete_document(COLLECTION, patient_id)
