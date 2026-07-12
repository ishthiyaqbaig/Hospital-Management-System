from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    id: str
    message: str
    answer: str
    handoff_required: bool
    created_at: datetime
