from pydantic import BaseModel, Field

from app.models.common import TimestampedResponse


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=30)


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=30)


class DepartmentResponse(TimestampedResponse, DepartmentCreate):
    pass
