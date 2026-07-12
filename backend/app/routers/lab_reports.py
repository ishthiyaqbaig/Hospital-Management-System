from fastapi import APIRouter, Depends, status

from app.models.common import PaginatedResponse, PaginationParams
from app.models.lab_report import LabReportCreate, LabReportResponse, LabReportUpdate
from app.services import crud
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/lab-reports", tags=["Lab Reports"])
COLLECTION = "lab_reports"
LAB_READ = ("admin", "doctor", "patient")


@router.post(
    "",
    response_model=LabReportResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("doctor"))],
)
async def create_lab_report(payload: LabReportCreate):
    return await crud.create_document(COLLECTION, payload)


@router.get(
    "",
    response_model=PaginatedResponse[LabReportResponse],
    dependencies=[Depends(require_roles(*LAB_READ))],
)
async def list_lab_reports(pagination: PaginationParams = Depends()):
    return await crud.list_documents(COLLECTION, pagination)


@router.get(
    "/{report_id}",
    response_model=LabReportResponse,
    dependencies=[Depends(require_roles(*LAB_READ))],
)
async def get_lab_report(report_id: str):
    return await crud.get_document(COLLECTION, report_id)


@router.patch(
    "/{report_id}",
    response_model=LabReportResponse,
    dependencies=[Depends(require_roles("doctor"))],
)
async def update_lab_report(report_id: str, payload: LabReportUpdate):
    return await crud.update_document(COLLECTION, report_id, payload)


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
async def delete_lab_report(report_id: str):
    await crud.delete_document(COLLECTION, report_id)
