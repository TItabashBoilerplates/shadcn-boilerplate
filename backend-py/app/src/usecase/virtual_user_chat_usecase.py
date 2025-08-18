from logging import getLogger

from domain.entity.virtual_chat import ChatRequest, ChatResponse
from gateway.chat_room_gateway import ChatRoomGateway
from gateway.llm_gateway import LLMGateway
from gateway.message_gateway import MessageGateway
from gateway.virtual_user_gateway import VirtualUserGateway
from infra.prisma_client import PrismaClient

logger = getLogger("uvicorn")


class VirtualUserChatUsecase:
    def __init__(self) -> None:
        self.prisma_client = PrismaClient()
        self.virtual_user_gateway = VirtualUserGateway()
        self.llm_gateway = LLMGateway(mode="gpt", model="gpt-4o-mini")
        self.message_gateway = MessageGateway()
        self.chat_room_gateway = ChatRoomGateway()

    async def process_virtual_user_chat(
        self,
        chat_room_id: str,
        virtual_user_id: str,
        request: ChatRequest,
    ) -> ChatResponse:
        async with self.prisma_client as prisma, prisma.tx() as transaction:
            # チャットルームの取得
            chat_room = await self.chat_room_gateway.get_by_id(
                prisma=transaction,
                chat_room_id=chat_room_id,
            )
            if not chat_room:
                raise ValueError("Chat room not found")

            # 仮想ユーザーの取得
            virtual_user = await self.virtual_user_gateway.get_by_id(
                prisma=transaction,
                virtual_user_id=virtual_user_id,
            )
            if not virtual_user:
                raise ValueError("Virtual user not found")

            # LLMを使用して仮想ユーザーの応答を生成
            system_message = f"あなたは{virtual_user.name}として振る舞ってください。"
            llm_response = self.llm_gateway.generate_text(
                request.message_content,
                system_message=system_message,
            )

            # 仮想ユーザーの応答を保存
            virtual_user_message = await self.message_gateway.create(
                prisma=transaction,
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
    ) -> ChatResponse:
        async with self.prisma_client as prisma, prisma.tx() as transaction:
            # 仮想ユーザーの取得
            virtual_user = await self.virtual_user_gateway.get_by_id(
                prisma=prisma,
                virtual_user_id=virtual_user_id,
            )
            if not virtual_user:
                raise ValueError("Virtual user not found")

            # チャットルームの作成
            chat_room = await self.chat_room_gateway.create(
                user_id="system",
                virtual_user_id=virtual_user_id,
            )

            # LLMを使用して仮想ユーザーの応答を生成
            system_message = f"あなたは{virtual_user.name}として振る舞ってください。"
            logger.info(f"System message: {system_message}")
            llm_response = self.llm_gateway.generate_text(
                request.message_content,
                system_message=system_message,
            )
            logger.info(f"LLM response: {llm_response}")

            # 仮想ユーザーの応答を保存
            virtual_user_message = await self.message_gateway.create(
                prisma=transaction,
                chat_room_id=chat_room.id,
                sender_id=virtual_user.id,
                content=llm_response,
            )
            logger.info(f"Virtual user message: {virtual_user_message}")
        return ChatResponse(success=True)
