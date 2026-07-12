from fastapi import APIRouter, Depends, status

from app.models.common import PaginatedResponse, PaginationParams
from app.models.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.services import crud
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/departments", tags=["Departments"])
COLLECTION = "departments"
ALL_ROLES = ("admin", "doctor", "receptionist", "patient")


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin"))],
)
async def create_department(payload: DepartmentCreate):
    return await crud.create_document(COLLECTION, payload)


@router.get(
    "",
    response_model=PaginatedResponse[DepartmentResponse],
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def list_departments(pagination: PaginationParams = Depends()):
    return await crud.list_documents(COLLECTION, pagination)


@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def get_department(department_id: str):
    return await crud.get_document(COLLECTION, department_id)


@router.patch(
    "/{department_id}",
    response_model=DepartmentResponse,
    dependencies=[Depends(require_roles("admin"))],
)
async def update_department(department_id: str, payload: DepartmentUpdate):
    return await crud.update_document(COLLECTION, department_id, payload)


@router.delete(
    "/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
async def delete_department(department_id: str):
    await crud.delete_document(COLLECTION, department_id)
