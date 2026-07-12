from fastapi import APIRouter, Depends, HTTPException, status

from app.models.common import PaginatedResponse, PaginationParams
from app.models.prescription import PrescriptionCreate, PrescriptionResponse, PrescriptionUpdate
from app.models.user import UserInDB
from app.services import billing as billing_service, crud
from app.services.database import get_database
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])
COLLECTION = "prescriptions"
PRESCRIPTION_READ = ("admin", "doctor", "patient")


@router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("doctor"))],
)
async def create_prescription(payload: PrescriptionCreate):
    from datetime import datetime, timezone
    prescription = await crud.create_document(COLLECTION, payload)
    db = get_database()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    await db["notifications"].insert_one({
        "user_id": payload.patient_id,
        "title": "New Prescription Issued",
        "message": "A new prescription has been issued for you. Please check your prescriptions tab.",
        "type": "reminder",
        "is_read": False,
        "created_at": now,
        "updated_at": now,
    })
    return prescription


@router.get(
    "",
    response_model=PaginatedResponse[PrescriptionResponse],
)
async def list_prescriptions(
    pagination: PaginationParams = Depends(),
    current_user: UserInDB = Depends(get_current_user),
):
    if current_user.role not in PRESCRIPTION_READ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )

    from bson import ObjectId
    from bson.errors import InvalidId
    def is_obj_id(v):
        try:
            ObjectId(v)
            return True
        except InvalidId:
            return False

    db = get_database()
    query = {}
    if current_user.role == "patient":
        query["patient_id"] = str(current_user.id)
    elif current_user.role == "doctor":
        doctor = await db["doctors"].find_one({"email": str(current_user.email).lower()})
        if doctor:
            query["doctor_id"] = str(doctor["_id"])
        else:
            query["doctor_id"] = "nonexistent"

    skip = (pagination.page - 1) * pagination.page_size
    cursor = db[COLLECTION].find(query).sort("created_at", -1).skip(skip).limit(pagination.page_size)
    documents = await cursor.to_list(length=pagination.page_size)
    
    items = []
    for doc in documents:
        item = crud.serialize_document(doc)
        d_id = item.get("doctor_id")
        if d_id:
            d_query = {"_id": ObjectId(d_id)} if is_obj_id(d_id) else {"_id": d_id}
            doctor = await db["doctors"].find_one(d_query)
            item["doctor_name"] = doctor.get("name", "Unknown doctor") if doctor else "Unknown doctor"
        else:
            item["doctor_name"] = "Unknown doctor"
        items.append(item)

    return {
        "items": items,
        "total": await db[COLLECTION].count_documents(query),
        "page": pagination.page,
        "page_size": pagination.page_size,
    }


@router.get(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    dependencies=[Depends(require_roles(*PRESCRIPTION_READ))],
)
async def get_prescription(prescription_id: str):
    return await crud.get_document(COLLECTION, prescription_id)


@router.patch(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    dependencies=[Depends(require_roles("doctor"))],
)
async def update_prescription(prescription_id: str, payload: PrescriptionUpdate):
    existing = await crud.get_document(COLLECTION, prescription_id)
    updated = await crud.update_document(COLLECTION, prescription_id, payload)
    if existing.get("status") != "completed" and payload.status == "completed":
        await billing_service.generate_billing_from_prescription(prescription_id)
    return updated


@router.delete(
    "/{prescription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin", "doctor"))],
)
async def delete_prescription(prescription_id: str):
    await crud.delete_document(COLLECTION, prescription_id)
