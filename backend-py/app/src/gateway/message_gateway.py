from prisma import Prisma
from prisma.models import Message
from prisma.types import (
    MessageCreateInput,
    MessageUpdateInput,
    MessageWhereInput,
    MessageWhereUniqueInput,
)


class MessageGateway:
    async def create(
        self,
        chat_room_id: int,
        virtual_sender_id: str,
        content: str,
        prisma: Prisma,
    ) -> Message:
        create_input = MessageCreateInput(
            chatRoomId=chat_room_id,
            virtualSenderId=virtual_sender_id,
            content=content,
        )
        return await prisma.message.create(data=create_input)

    async def get_by_id(
        self,
        message_id: int,
        prisma: Prisma,
    ) -> Message | None:
        where_input = MessageWhereUniqueInput(id=message_id)
        return await prisma.message.find_unique(where=where_input)

    async def get_all_by_chat_room_id(
        self,
        chat_room_id: int,
        prisma: Prisma,
    ) -> list[Message]:
        where_input = MessageWhereInput(chatRoomId=chat_room_id)
        return await prisma.message.find_many(where=where_input)

    async def update(
        self,
        message_id: int,
        content: str,
        prisma: Prisma,
    ) -> Message:
        where_input = MessageWhereUniqueInput(id=message_id)
        update_input = MessageUpdateInput(content=content)
        result = await prisma.message.update(where=where_input, data=update_input)
        if result is None:
            raise ValueError("Message not found")
        return result

    async def delete(
        self,
        message_id: int,
        prisma: Prisma,
    ) -> Message:
        where_input = MessageWhereUniqueInput(id=message_id)
        result = await prisma.message.delete(where=where_input)
        if result is None:
            raise ValueError("Message not found")
        return result
