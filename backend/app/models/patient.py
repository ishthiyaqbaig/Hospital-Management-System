from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.models.common import TimestampedResponse

Gender = Literal["female", "male", "other", "unknown"]


class PatientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    gender: Gender = "unknown"
    address: str | None = Field(default=None, max_length=300)
    emergency_contact: str | None = Field(default=None, max_length=120)


class PatientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    gender: Gender | None = None
    address: str | None = Field(default=None, max_length=300)
    emergency_contact: str | None = Field(default=None, max_length=120)


class PatientResponse(TimestampedResponse, PatientCreate):
    pass
