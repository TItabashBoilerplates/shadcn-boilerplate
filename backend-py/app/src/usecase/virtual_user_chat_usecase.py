from logging import getLogger

from sqlmodel import Session

from src.domain.entity.virtual_chat import ChatRequest, ChatResponse
from src.gateway.chat_room_gateway import ChatRoomGateway
from src.gateway.llm_gateway import LLMGateway
from src.gateway.message_gateway import MessageGateway
from src.gateway.virtual_user_gateway import VirtualUserGateway

logger = getLogger("uvicorn")


class VirtualUserChatUsecase:
    def __init__(self) -> None:
        self.virtual_user_gateway = VirtualUserGateway()
        self.llm_gateway = LLMGateway(mode="gpt", model="gpt-4o-mini")
        self.message_gateway = MessageGateway()
        self.chat_room_gateway = ChatRoomGateway()

    async def process_virtual_user_chat(
        self,
        chat_room_id: int,
        virtual_user_id: str,
        request: ChatRequest,
        session: Session,
    ) -> ChatResponse:
        # トランザクション開始
        with session.begin():
            # チャットルームの取得（同期）
            chat_room = self.chat_room_gateway.get_by_id(
                session=session,
                chat_room_id=chat_room_id,
            )
            if not chat_room:
                raise ValueError("Chat room not found")

            # 仮想ユーザーの取得（同期）
            virtual_user = self.virtual_user_gateway.get_by_id(
                session=session,
                virtual_user_id=virtual_user_id,
            )
            if not virtual_user:
                raise ValueError("Virtual user not found")

            # LLMを使用して仮想ユーザーの応答を生成（非同期）
            system_message = f"あなたは{virtual_user.name}として振る舞ってください。"
            llm_response = await self.llm_gateway.generate_text(
                request.message_content,
                system_message=system_message,
            )

            # 仮想ユーザーの応答を保存（同期）
            virtual_user_message = self.message_gateway.create(
                session=session,
                chat_room_id=chat_room.id,
                virtual_sender_id=virtual_user.id,
                content=llm_response,
            )
            logger.info(f"Virtual user message: {virtual_user_message}")

        return ChatResponse(success=True)

    async def initiate_virtual_user_chat(
        self,
        virtual_user_id: str,
        request: ChatRequest,
        session: Session,
    ) -> ChatResponse:
        # トランザクション開始
        with session.begin():
            # 仮想ユーザーの取得（同期）
            virtual_user = self.virtual_user_gateway.get_by_id(
                session=session,
                virtual_user_id=virtual_user_id,
            )
            if not virtual_user:
                raise ValueError("Virtual user not found")

            # チャットルームの作成（同期）
            chat_room = self.chat_room_gateway.create(
                user_id="system",
                session=session,
            )

            # LLMを使用して仮想ユーザーの応答を生成（非同期）
            system_message = f"あなたは{virtual_user.name}として振る舞ってください。"
            logger.info(f"System message: {system_message}")
            llm_response = await self.llm_gateway.generate_text(
                request.message_content,
                system_message=system_message,
            )
            logger.info(f"LLM response: {llm_response}")

            # 仮想ユーザーの応答を保存（同期）
            virtual_user_message = self.message_gateway.create(
                session=session,
                chat_room_id=chat_room.id,
                virtual_sender_id=virtual_user.id,
                content=llm_response,
            )
            logger.info(f"Virtual user message: {virtual_user_message}")

        return ChatResponse(success=True)
