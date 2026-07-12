from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.models.billing import BillingCreate, BillingItem, BillingUpdate
from app.models.user import UserInDB
from app.services import crud
from app.services.database import get_database

COLLECTION = "billing"


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def calculate_amount(items: list[BillingItem]) -> float:
    return round(sum(item.quantity * item.unit_price for item in items), 2)


def build_default_items(*, appointment_id: str | None = None, prescription_id: str | None = None) -> list[BillingItem]:
    items: list[BillingItem] = []
    if appointment_id:
        items.append(BillingItem(description="Consultation fee", quantity=1, unit_price=100.0, category="consultation"))
        items.append(BillingItem(description="Facility/service charge", quantity=1, unit_price=20.0, category="service"))
    if prescription_id:
        items.append(BillingItem(description="Prescription dispensing fee", quantity=1, unit_price=15.0, category="prescription"))
    if not items:
        items.append(BillingItem(description="General service fee", quantity=1, unit_price=0.0, category="service"))
    return items


async def create_billing(payload: BillingCreate) -> dict[str, Any]:
    data = payload.model_dump(exclude_none=True, mode="json")
    if data.get("amount") is None:
        items = [BillingItem(**item) for item in data.get("items", [])]
        data["amount"] = calculate_amount(items)
    if not data.get("currency"):
        data["currency"] = "USD"
    return await crud.create_document(COLLECTION, BillingCreate(**data))


async def generate_billing_for_context(
    *,
    patient_id: str,
    appointment_id: str | None = None,
    prescription_id: str | None = None,
    description: str | None = None,
) -> dict[str, Any]:
    collection = get_database()[COLLECTION]
    query: dict[str, Any] = {"patient_id": patient_id}
    if appointment_id:
        query["appointment_id"] = appointment_id
    if prescription_id:
        query["prescription_id"] = prescription_id
    existing = await collection.find_one(query)
    if existing is not None:
        return crud.serialize_document(existing)

    items = build_default_items(appointment_id=appointment_id, prescription_id=prescription_id)
    payload = BillingCreate(
        patient_id=patient_id,
        appointment_id=appointment_id,
        prescription_id=prescription_id,
        items=items,
        amount=calculate_amount(items),
        currency="USD",
        status="pending",
        description=description or "Hospital service charges",
        due_date=None,
    )
    return await create_billing(payload)


async def generate_billing_from_appointment(appointment_id: str) -> dict[str, Any]:
    appointment = await crud.get_document("appointments", appointment_id)
    return await generate_billing_for_context(
        patient_id=appointment["patient_id"],
        appointment_id=appointment_id,
        description=f"Charges for appointment {appointment_id}",
    )


async def generate_billing_from_prescription(prescription_id: str) -> dict[str, Any]:
    prescription = await crud.get_document("prescriptions", prescription_id)
    return await generate_billing_for_context(
        patient_id=prescription["patient_id"],
        prescription_id=prescription_id,
        description=f"Charges for prescription {prescription_id}",
    )


async def list_billing_documents(pagination, current_user: UserInDB) -> dict[str, Any]:
    collection = get_database()[COLLECTION]
    skip = (pagination.page - 1) * pagination.page_size
    query = {} if current_user.role in {"admin", "receptionist"} else {"patient_id": current_user.id}
    cursor = collection.find(query).sort("created_at", -1).skip(skip).limit(pagination.page_size)
    documents = await cursor.to_list(length=pagination.page_size)
    return {
        "items": [crud.serialize_document(document) for document in documents],
        "total": await collection.count_documents(query),
        "page": pagination.page,
        "page_size": pagination.page_size,
    }


async def get_billing_document(billing_id: str, current_user: UserInDB) -> dict[str, Any]:
    document = await get_database()[COLLECTION].find_one({"_id": crud._object_id(billing_id)})
    if document is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found")
    if current_user.role == "patient" and str(document.get("patient_id")) != str(current_user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only access your own billing records")
    return crud.serialize_document(document)


async def update_billing_document(billing_id: str, payload: BillingUpdate, current_user: UserInDB) -> dict[str, Any]:
    if current_user.role not in {"admin", "receptionist"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only receptionists and admins can edit billing records")
    update_data = payload.model_dump(exclude_unset=True, exclude_none=True, mode="json")
    if update_data:
        update_data["updated_at"] = _now()
        await get_database()[COLLECTION].update_one({"_id": crud._object_id(billing_id)}, {"$set": update_data})
    return await get_billing_document(billing_id, current_user)


def build_receipt_pdf(billing_document: dict[str, Any]) -> bytes:
    lines = [
        "MediFlow Hospital Receipt",
        "========================",
        f"Bill ID: {billing_document.get('id', 'N/A')}",
        f"Patient ID: {billing_document.get('patient_id', 'N/A')}",
        f"Status: {billing_document.get('status', 'pending')}",
        f"Amount: {billing_document.get('currency', 'USD')} {billing_document.get('amount', 0):.2f}",
        "Items:",
    ]
    for item in billing_document.get("items", []):
        description = item.get("description", "Service")
        quantity = item.get("quantity", 1)
        unit_price = item.get("unit_price", 0.0)
        lines.append(f"- {description} x{quantity} @ {unit_price:.2f}")
    lines.extend([
        "",
        "Thank you for choosing MediFlow Hospital.",
    ])

    escaped_lines = [escape_pdf_text(line) for line in lines]
    content_parts = []
    y = 760
    for line in escaped_lines:
        content_parts.append(f"BT /F1 12 Tf 72 {y} Td ({line}) Tj ET")
        y -= 14
    content = "\n".join(content_parts)

    objects: list[str] = []
    objects.append("<< /Type /Catalog /Pages 2 0 R >>")
    objects.append("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>")
    objects.append("<< /Length 0 >>\nstream\n" + content + "\nendstream")
    objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    offsets = [0]
    pdf = bytearray(b"%PDF-1.4\n")
    object_offsets: list[int] = []
    for index, obj in enumerate(objects, start=1):
        object_offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("latin-1"))
        pdf.extend(obj.encode("latin-1"))
        pdf.extend(b"\nendobj\n")
    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in object_offsets:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("latin-1"))
    return bytes(pdf)


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
