from fastapi import APIRouter, Depends

from app.models.chat import ChatRequest, ChatResponse
from app.models.user import UserInDB
from app.services.chat import answer_patient_chat
from app.utils.dependencies import require_roles

router = APIRouter(tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def patient_chat(
    payload: ChatRequest,
    patient: UserInDB = Depends(require_roles("patient")),
):
    return await answer_patient_chat(payload, patient)
