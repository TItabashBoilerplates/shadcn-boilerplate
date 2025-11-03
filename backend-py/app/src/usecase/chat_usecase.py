"""Chat use case for handling chat interactions."""

from sqlmodel import Session, select

from src.domain.entity.chat import ChatRequest, ChatResponse
from src.domain.entity.models import (
    VirtualUserChats,
    VirtualUserProfiles,
)
from src.gateway.chat_room_gateway import ChatRoomGateway
from src.gateway.current_user_gateway import CurrentUserGateway
from src.gateway.embeddings_gateway import EmbeddingsGateway
from src.gateway.message_gateway import MessageGateway
from src.gateway.openai_gateway import OpenAIGateway
from src.gateway.user_profile_gateway import UserProfileGateway
from src.gateway.virtual_user_gateway import VirtualUserGateway


class ChatUseCase:
    """Use case for chat operations."""

    def __init__(self, access_token: str | None = None):
        """Initialize use case with gateways.

        Args:
            access_token: Supabase access token for authentication
        """
        self.current_user_gateway = CurrentUserGateway(access_token)
        self.user_profile_gateway = UserProfileGateway()
        self.chat_room_gateway = ChatRoomGateway()
        self.message_gateway = MessageGateway()
        self.virtual_user_gateway = VirtualUserGateway()
        self.embeddings_gateway = EmbeddingsGateway()
        self.openai_gateway = OpenAIGateway()

    def execute(
        self, request: ChatRequest, session: Session
    ) -> ChatResponse:
        """Execute chat interaction.

        Args:
            request: Chat request
            session: Database session

        Returns:
            Chat response with AI message
        """
        # 1. Get current user (GeneralUsers)
        current_user = self.current_user_gateway.get_current_user(session)
        if current_user is None:
            raise ValueError("User not authenticated")

        # 2. Get user profile (GeneralUserProfiles)
        user_profile = self.user_profile_gateway.get_or_create(
            current_user.id, session
        )

        # 3. Get or create chat room (ChatRooms, UserChats)
        if request.chat_room_id is not None:
            chat_room = self.chat_room_gateway.get_by_id(
                request.chat_room_id, session
            )
            if chat_room is None:
                raise ValueError("Chat room not found")
        else:
            chat_room = self.chat_room_gateway.create(current_user.id, session)

        # 4. Get or create virtual user (VirtualUsers)
        virtual_users = self.virtual_user_gateway.get_by_owner_id(
            current_user.id, session
        )
        if len(virtual_users) == 0:
            virtual_user = self.virtual_user_gateway.create(
                name="AI Assistant",
                owner_id=current_user.id,
                session=session,
            )
        else:
            virtual_user = virtual_users[0]

        # 5. Link virtual user to chat room (VirtualUserChats)
        statement = select(VirtualUserChats).where(
            VirtualUserChats.virtual_user_id == virtual_user.id,
            VirtualUserChats.chat_room_id == chat_room.id,
        )
        virtual_user_chat = session.exec(statement).first()
        if virtual_user_chat is None:
            virtual_user_chat = VirtualUserChats(
                virtual_user_id=virtual_user.id,
                chat_room_id=chat_room.id,
            )
            session.add(virtual_user_chat)
            session.commit()

        # 6. Get virtual user profile (VirtualUserProfiles)
        statement = select(VirtualUserProfiles).where(
            VirtualUserProfiles.virtual_user_id == virtual_user.id
        )
        virtual_user_profile = session.exec(statement).first()

        # 7. Save user message (Messages)
        user_message = self.message_gateway.create(
            chat_room_id=chat_room.id,
            virtual_sender_id=virtual_user.id,
            content=request.message,
            session=session,
        )

        # 8. Search embeddings for context (Embeddings)
        embeddings = self.embeddings_gateway.search_similar(
            query=request.message,
            limit=3,
            session=session,
        )

        # Build context from embeddings
        context = None
        if len(embeddings) > 0:
            context = "\n".join([emb.content for emb in embeddings])

        # 9. Call OpenAI API
        system_prompt = "あなたは親切なAIアシスタントです。ユーザーの質問に丁寧に答えてください。"
        ai_response = self.openai_gateway.chat_completion(
            user_message=request.message,
            system_prompt=system_prompt,
            context=context,
        )

        # 10. Save AI response message (Messages)
        ai_message = self.message_gateway.create(
            chat_room_id=chat_room.id,
            virtual_sender_id=virtual_user.id,
            content=ai_response,
            session=session,
        )

        # 11. Return response
        return ChatResponse(
            chat_room_id=chat_room.id,
            user_message_id=user_message.id,
            ai_message_id=ai_message.id,
            ai_response=ai_response,
            virtual_user={
                "id": virtual_user.id,
                "name": virtual_user.name,
                "profile": {
                    "bio": virtual_user_profile.bio if virtual_user_profile else None
                },
            },
        )
