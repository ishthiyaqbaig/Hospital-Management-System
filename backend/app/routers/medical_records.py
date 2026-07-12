from fastapi import APIRouter, Depends, status

from app.models.common import PaginatedResponse, PaginationParams
from app.models.medical_record import MedicalRecordCreate, MedicalRecordResponse, MedicalRecordUpdate
from app.services import crud
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/medical-records", tags=["Medical Records"])
COLLECTION = "medical_records"
CLINICAL_READ = ("admin", "doctor")


@router.post(
    "",
    response_model=MedicalRecordResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("doctor"))],
)
async def create_medical_record(payload: MedicalRecordCreate):
    return await crud.create_document(COLLECTION, payload)


@router.get(
    "",
    response_model=PaginatedResponse[MedicalRecordResponse],
    dependencies=[Depends(require_roles(*CLINICAL_READ))],
)
async def list_medical_records(pagination: PaginationParams = Depends()):
    return await crud.list_documents(COLLECTION, pagination)


@router.get(
    "/{record_id}",
    response_model=MedicalRecordResponse,
    dependencies=[Depends(require_roles(*CLINICAL_READ))],
)
async def get_medical_record(record_id: str):
    return await crud.get_document(COLLECTION, record_id)


@router.patch(
    "/{record_id}",
    response_model=MedicalRecordResponse,
    dependencies=[Depends(require_roles("doctor"))],
)
async def update_medical_record(record_id: str, payload: MedicalRecordUpdate):
    return await crud.update_document(COLLECTION, record_id, payload)


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
async def delete_medical_record(record_id: str):
    await crud.delete_document(COLLECTION, record_id)
