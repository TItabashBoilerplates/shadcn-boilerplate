from datetime import datetime

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message_content: str


class MessageResponse(BaseModel):
    id: str
    chat_room_id: str
    sender_id: str
    content: str
    created_at: datetime


class ChatResponse(BaseModel):
    success: bool
