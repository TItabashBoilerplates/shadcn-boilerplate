from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session
from supabase_auth.types import User

from infra.db_client import get_session
from middleware.auth_middleware import authorization_header, verify_token
from src.domain.entity.chat import ChatRequest, ChatResponse
from src.usecase.chat_usecase import ChatUseCase

router = APIRouter()


@router.get("/")
async def root(
    current_user: Annotated[User, Depends(verify_token)],
) -> dict[str, str]:
    return {"message": f"Hello {current_user.email}"}


@router.get("/healthcheck")
async def healthcheck() -> dict[str, str]:
    return {"message": "OK"}


@router.post("/api/chat")
async def chat(
    request: ChatRequest,
    session: Annotated[Session, Depends(get_session)],
    auth_header: Annotated[str, Depends(authorization_header)],
) -> ChatResponse:
    """Chat endpoint that uses all domain models.

    This endpoint:
    - Authenticates user (GeneralUsers)
    - Gets user profile (GeneralUserProfiles)
    - Creates/gets chat room (ChatRooms, UserChats)
    - Saves messages (Messages)
    - Gets/creates virtual user (VirtualUsers, VirtualUserChats)
    - Gets virtual user profile (VirtualUserProfiles)
    - Searches embeddings (Embeddings)
    - Calls OpenAI API
    """
    # Extract token from header
    if not auth_header.startswith("Bearer "):
        msg = "Invalid authorization header format"
        raise ValueError(msg)

    token = auth_header.split(" ")[1]

    # Execute use case
    use_case = ChatUseCase(access_token=token)
    return use_case.execute(request, session)
