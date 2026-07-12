from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.common import TimestampedResponse

BillingStatus = Literal["pending", "paid", "cancelled"]


class BillingItem(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(default=0.0, ge=0)
    category: str | None = Field(default=None, max_length=50)


class BillingCreate(BaseModel):
    patient_id: str
    appointment_id: str | None = None
    prescription_id: str | None = None
    items: list[BillingItem] = Field(default_factory=list)
    amount: float | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    status: BillingStatus = "pending"
    description: str | None = Field(default=None, max_length=500)
    due_date: datetime | None = None


class BillingUpdate(BaseModel):
    patient_id: str | None = None
    appointment_id: str | None = None
    prescription_id: str | None = None
    items: list[BillingItem] | None = None
    amount: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    status: BillingStatus | None = None
    description: str | None = Field(default=None, max_length=500)
    due_date: datetime | None = None


class BillingResponse(TimestampedResponse, BillingCreate):
    pass
