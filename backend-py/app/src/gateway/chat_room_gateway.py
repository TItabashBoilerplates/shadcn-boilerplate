from prisma import Prisma
from prisma.enums import ChatType
from prisma.models import ChatRoom
from prisma.types import (
    ChatRoomCreateInput,
    ChatRoomUpdateInput,
    ChatRoomWhereInput,
    ChatRoomWhereUniqueInput,
    UserChatCreateManyNestedWithoutRelationsInput,
)


class ChatRoomGateway:
    async def create(
        self,
        user_id: str,
        prisma: Prisma,
    ) -> ChatRoom:
        create_input = ChatRoomCreateInput(
            type=ChatType.PRIVATE,
            userChats=UserChatCreateManyNestedWithoutRelationsInput(
                create=[{"userId": user_id}],
            ),
        )
        return await prisma.chatroom.create(data=create_input)

    async def get_by_id(
        self,
        chat_room_id: int,
        prisma: Prisma,
    ) -> ChatRoom | None:
        where_input = ChatRoomWhereUniqueInput(id=chat_room_id)
        return await prisma.chatroom.find_unique(
            where=where_input,
            include={
                "userChats": True,
                "virtualChats": True,
            },
        )

    async def get_all_by_user_id(
        self,
        user_id: str,
        prisma: Prisma,
    ) -> list[ChatRoom]:
        where_input = ChatRoomWhereInput(userChats={"some": {"userId": user_id}})
        return await prisma.chatroom.find_many(where=where_input)

    async def update(
        self,
        chat_room_id: int,
        prisma: Prisma,
    ) -> ChatRoom:
        where_input = ChatRoomWhereUniqueInput(id=chat_room_id)
        update_input = ChatRoomUpdateInput()
        result = await prisma.chatroom.update(where=where_input, data=update_input)
        if result is None:
            raise ValueError("ChatRoom not found")
        return result

    async def delete(
        self,
        chat_room_id: int,
        prisma: Prisma,
    ) -> ChatRoom:
        where_input = ChatRoomWhereUniqueInput(id=chat_room_id)
        result = await prisma.chatroom.delete(where=where_input)
        if result is None:
            raise ValueError("ChatRoom not found")
        return result
