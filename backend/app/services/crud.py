from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.models.common import PaginationParams
from app.services.database import get_database


def _collection(name: str):
    return get_database()[name]


def _object_id(document_id: str) -> ObjectId:
    try:
        return ObjectId(document_id)
    except InvalidId as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found") from exc


def serialize_document(document: dict[str, Any]) -> dict[str, Any]:
    data = dict(document)
    data["id"] = str(data.pop("_id"))

    if "created_at" not in data:
        data["created_at"] = datetime.now(timezone.utc)
    if "updated_at" not in data:
        data["updated_at"] = data["created_at"]
    if "license_number" not in data:
        data["license_number"] = ""

    return data


async def create_document(collection_name: str, payload) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    data = payload.model_dump(exclude_none=True, mode="json")
    data.update({"created_at": now, "updated_at": now})
    result = await _collection(collection_name).insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_document(data)


async def list_documents(
    collection_name: str,
    pagination: PaginationParams,
) -> dict[str, Any]:
    skip = (pagination.page - 1) * pagination.page_size
    collection = _collection(collection_name)
    cursor = collection.find().sort("created_at", -1).skip(skip).limit(pagination.page_size)
    documents = await cursor.to_list(length=pagination.page_size)
    total = await collection.count_documents({})
    return {
        "items": [serialize_document(document) for document in documents],
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
    }


async def get_document(collection_name: str, document_id: str) -> dict[str, Any]:
    document = await _collection(collection_name).find_one({"_id": _object_id(document_id)})
    if document is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found")
    return serialize_document(document)


async def update_document(collection_name: str, document_id: str, payload) -> dict[str, Any]:
    update_data = payload.model_dump(exclude_unset=True, exclude_none=True, mode="json")
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await _collection(collection_name).update_one(
            {"_id": _object_id(document_id)},
            {"$set": update_data},
        )
    return await get_document(collection_name, document_id)


async def delete_document(collection_name: str, document_id: str) -> None:
    result = await _collection(collection_name).delete_one({"_id": _object_id(document_id)})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found")
