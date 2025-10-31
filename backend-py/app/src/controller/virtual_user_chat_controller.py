from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException
from gotrue.types import User
from sqlmodel import Session

from src.domain.entity.supabase_webhook_payload import SupabaseWebhookPayload
from src.domain.entity.virtual_chat import (
    ChatRequest,
    ChatResponse,
)
from src.infra.db_client import get_session
from src.middleware.auth_middleware import verify_token
from src.usecase.virtual_user_chat_usecase import VirtualUserChatUsecase

router = APIRouter()

logger = getLogger("uvicorn")


@router.post("/webhook/virtual_user_chat", response_model=ChatResponse)
async def handle_virtual_user_chat_webhook(
    payload: SupabaseWebhookPayload,
    session: Session = Depends(get_session),
) -> ChatResponse:
    usecase = VirtualUserChatUsecase()
    try:
        if payload.table == "messages" and payload.type == "INSERT":
            user_id = payload.record.get("sender_id")
            virtual_user_id = payload.record.get("virtual_sender_id")
            chat_room_id = payload.record.get("chat_room_id")
            message_content = payload.record.get("content")

            if user_id is not None:
                return ChatResponse(success=True)

            if not all([virtual_user_id, chat_room_id, message_content]):
                raise ValueError("Invalid payload: missing required fields")

            chat_request = ChatRequest(message_content=message_content)
            response = await usecase.process_virtual_user_chat(
                int(chat_room_id),
                str(virtual_user_id),
                chat_request,
                session,
            )
            return response
        # 他のテーブルやイベントタイプは無視する
        return ChatResponse(success=True)
    except ValueError as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/virtual_user/{virtual_user_id}/chat", response_model=ChatResponse)
async def chat_with_virtual_user_initially(
    virtual_user_id: str,
    chat_request: ChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(verify_token),
) -> ChatResponse:
    usecase = VirtualUserChatUsecase()
    try:
        response = await usecase.initiate_virtual_user_chat(
            virtual_user_id,
            chat_request,
            session,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/chat_room/{chat_room_id}/virtual_user/{virtual_user_id}/chat",
    response_model=ChatResponse,
)
async def chat_with_virtual_user(
    chat_room_id: int,
    virtual_user_id: str,
    chat_request: ChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(verify_token),
) -> ChatResponse:
    usecase = VirtualUserChatUsecase()
    try:
        response = await usecase.process_virtual_user_chat(
            chat_room_id,
            virtual_user_id,
            chat_request,
            session,
        )
        return response
    except ValueError as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
