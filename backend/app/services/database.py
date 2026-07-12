from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.utils.config import get_settings

_client: AsyncIOMotorClient | None = None


async def connect_database() -> None:
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongo_uri)


async def close_database() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_database() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("MongoDB client is not connected")
    return _client[get_settings().mongo_database]
