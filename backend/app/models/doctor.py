from pydantic import BaseModel, EmailStr, Field

from app.models.common import TimestampedResponse


class DoctorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    department_id: str | None = None
    specialization: str = Field(min_length=2, max_length=120)
    license_number: str = Field(min_length=2, max_length=80)
    availability: list[str] = Field(default_factory=list)


class DoctorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    department_id: str | None = None
    specialization: str | None = Field(default=None, min_length=2, max_length=120)
    license_number: str | None = Field(default=None, min_length=2, max_length=80)
    availability: list[str] | None = None


class DoctorResponse(TimestampedResponse, DoctorCreate):
    pass
