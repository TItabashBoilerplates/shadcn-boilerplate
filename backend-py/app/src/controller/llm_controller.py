from fastapi import APIRouter

from domain.entity.chat_response import ChatResponse
from usecase.llm_chat_usecase import LLMChatUsecase

router = APIRouter()


@router.post("/generate_reply")
async def generate_reply(prompt: str) -> ChatResponse:
    llm_usecase = LLMChatUsecase()
    response = llm_usecase.execute(prompt)
    return response
