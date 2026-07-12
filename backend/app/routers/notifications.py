from fastapi import APIRouter, Depends, HTTPException, status

from app.models.common import PaginatedResponse, PaginationParams
from app.models.notification import NotificationCreate, NotificationResponse, NotificationUpdate
from app.models.user import UserInDB
from app.services import crud
from app.services.database import get_database
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/notifications", tags=["Notifications"])
COLLECTION = "notifications"
ALL_ROLES = ("admin", "doctor", "receptionist", "patient")


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "doctor", "receptionist"))],
)
async def create_notification(payload: NotificationCreate):
    return await crud.create_document(COLLECTION, payload)


@router.get(
    "",
    response_model=PaginatedResponse[NotificationResponse],
)
async def list_notifications(
    pagination: PaginationParams = Depends(),
    current_user: UserInDB = Depends(get_current_user),
):
    if current_user.role not in ALL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )
    db = get_database()
    query = {}
    if current_user.role != "admin":
        query["user_id"] = str(current_user.id)

    skip = (pagination.page - 1) * pagination.page_size
    cursor = db[COLLECTION].find(query).sort("created_at", -1).skip(skip).limit(pagination.page_size)
    documents = await cursor.to_list(length=pagination.page_size)

    return {
        "items": [crud.serialize_document(doc) for doc in documents],
        "total": await db[COLLECTION].count_documents(query),
        "page": pagination.page,
        "page_size": pagination.page_size,
    }


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def get_notification(notification_id: str):
    return await crud.get_document(COLLECTION, notification_id)


@router.patch(
    "/{notification_id}",
    response_model=NotificationResponse,
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def update_notification(notification_id: str, payload: NotificationUpdate):
    return await crud.update_document(COLLECTION, notification_id, payload)


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
async def delete_notification(notification_id: str):
    await crud.delete_document(COLLECTION, notification_id)
