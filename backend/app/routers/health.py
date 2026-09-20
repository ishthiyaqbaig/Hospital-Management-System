from fastapi import APIRouter

from app.models.health import ComponentHealth
from app.models.health import HealthResponse
from app.services.database import get_database
from app.utils.config import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    settings = get_settings()
    checks = {
        "api": ComponentHealth(status="ok", message="FastAPI application is responding."),
        "database": await _database_check(),
        "gemini": _gemini_check(settings.gemini_api_key, settings.gemini_model),
    }
    status = "ok" if all(item.status == "ok" for item in checks.values()) else "degraded"
    return HealthResponse(
        status=status,
        service=settings.app_name,
        version=settings.app_version,
        checks=checks,
    )


async def _database_check() -> ComponentHealth:
    try:
        await get_database().command("ping")
    except Exception as exc:
        return ComponentHealth(status="error", message=f"MongoDB ping failed: {exc}")
    return ComponentHealth(status="ok", message="MongoDB connection is healthy.")


def _gemini_check(api_key: str, model: str) -> ComponentHealth:
    if not api_key:
        return ComponentHealth(status="error", message="Gemini API key is missing.")
    return ComponentHealth(status="ok", message=f"Gemini is configured with {model}.")
