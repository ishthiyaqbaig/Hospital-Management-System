from typing import Literal

from pydantic import BaseModel, Field

from app.models.common import TimestampedResponse

NotificationType = Literal["info", "reminder", "billing", "lab", "auth"]


class NotificationCreate(BaseModel):
    user_id: str
    title: str = Field(min_length=2, max_length=160)
    message: str = Field(min_length=2, max_length=1000)
    type: NotificationType = "info"
    is_read: bool = False


class NotificationUpdate(BaseModel):
    user_id: str | None = None
    title: str | None = Field(default=None, min_length=2, max_length=160)
    message: str | None = Field(default=None, min_length=2, max_length=1000)
    type: NotificationType | None = None
    is_read: bool | None = None


class NotificationResponse(TimestampedResponse, NotificationCreate):
    pass
