from fastapi import APIRouter, Depends, Response, status

from app.models.billing import BillingCreate, BillingResponse, BillingUpdate
from app.models.common import PaginatedResponse, PaginationParams
from app.models.user import UserInDB
from app.services import billing as billing_service, crud
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/billing", tags=["Billing"])
COLLECTION = "billing"
BILLING_READ = ("admin", "receptionist", "patient")


@router.post(
    "",
    response_model=BillingResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("receptionist"))],
)
async def create_billing(payload: BillingCreate):
    return await billing_service.create_billing(payload)


@router.get(
    "",
    response_model=PaginatedResponse[BillingResponse],
    dependencies=[Depends(require_roles(*BILLING_READ))],
)
async def list_billing(
    pagination: PaginationParams = Depends(),
    current_user: UserInDB = Depends(get_current_user),
):
    return await billing_service.list_billing_documents(pagination, current_user)


@router.get(
    "/{billing_id}",
    response_model=BillingResponse,
    dependencies=[Depends(require_roles(*BILLING_READ))],
)
async def get_billing(billing_id: str, current_user: UserInDB = Depends(get_current_user)):
    return await billing_service.get_billing_document(billing_id, current_user)


@router.get(
    "/{billing_id}/receipt",
    response_class=Response,
    dependencies=[Depends(require_roles(*BILLING_READ))],
)
async def download_billing_receipt(
    billing_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    billing_document = await billing_service.get_billing_document(billing_id, current_user)
    pdf_bytes = billing_service.build_receipt_pdf(billing_document)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=billing-{billing_id}.pdf"},
    )


@router.patch(
    "/{billing_id}",
    response_model=BillingResponse,
    dependencies=[Depends(require_roles("admin", "receptionist"))],
)
async def update_billing(
    billing_id: str,
    payload: BillingUpdate,
    current_user: UserInDB = Depends(get_current_user),
):
    return await billing_service.update_billing_document(billing_id, payload, current_user)


@router.delete(
    "/{billing_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
async def delete_billing(billing_id: str):
    await crud.delete_document(COLLECTION, billing_id)
