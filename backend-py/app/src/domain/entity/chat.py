"""Chat API request and response models."""

from typing import Any

from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    message: str
    chat_room_id: int | None = None


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""

    chat_room_id: int
    user_message_id: int
    ai_message_id: int
    ai_response: str
    virtual_user: dict[str, Any]
