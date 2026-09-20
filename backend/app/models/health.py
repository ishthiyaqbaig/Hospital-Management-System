from pydantic import BaseModel
from pydantic import Field


class ComponentHealth(BaseModel):
    status: str
    message: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    checks: dict[str, ComponentHealth] = Field(default_factory=dict)
