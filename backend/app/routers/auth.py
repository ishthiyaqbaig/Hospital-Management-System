from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.models.common import PaginatedResponse, PaginationParams
from app.models.user import TokenResponse, UserCreate, UserLogin, UserPublic, UserInDB
from app.services.users import create_user, get_user_by_email, serialize_user
from app.services.database import get_database
from app.utils.dependencies import get_current_user, require_roles
from app.utils.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: UserCreate) -> TokenResponse:
    existing_user = await get_user_by_email(payload.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    try:
        user = await create_user(payload)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        ) from exc

    token = create_access_token(
        subject=user.email,
        extra_claims={"role": user.role},
    )
    return TokenResponse(access_token=token, user=UserPublic(**user.model_dump()))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin) -> TokenResponse:
    user = await get_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        subject=user.email,
        extra_claims={"role": user.role},
    )
    return TokenResponse(access_token=token, user=UserPublic(**user.model_dump()))


@router.get("/me", response_model=UserPublic)
async def me(current_user=Depends(get_current_user)) -> UserPublic:
    return UserPublic(**current_user.model_dump())


@router.get(
    "/users",
    response_model=PaginatedResponse[UserPublic],
)
async def list_users(
    pagination: PaginationParams = Depends(),
    current_user: UserInDB = Depends(require_roles("admin")),
):
    db = get_database()
    skip = (pagination.page - 1) * pagination.page_size
    cursor = db["users"].find().sort("created_at", -1).skip(skip).limit(pagination.page_size)
    documents = await cursor.to_list(length=pagination.page_size)
    total = await db["users"].count_documents({})
    return {
        "items": [UserPublic(**serialize_user(doc).model_dump()) for doc in documents],
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
    }
