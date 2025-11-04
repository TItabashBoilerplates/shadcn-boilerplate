from uuid import UUID

from sqlmodel import Session, select

from src.domain.entity.models import ChatRooms, UserChats


class ChatRoomGateway:
    def create(
        self,
        user_id: UUID,
        session: Session,
    ) -> ChatRooms:
        # チャットルームを作成
        chat_room = ChatRooms(type="PRIVATE")
        session.add(chat_room)
        session.commit()
        session.refresh(chat_room)

        # ユーザチャットの関連を作成
        user_chat = UserChats(user_id=user_id, chat_room_id=chat_room.id)
        session.add(user_chat)
        session.commit()

        return chat_room

    def get_by_id(
        self,
        chat_room_id: int,
        session: Session,
    ) -> ChatRooms | None:
        statement = select(ChatRooms).where(ChatRooms.id == chat_room_id)
        return session.exec(statement).first()

    def update(
        self,
        chat_room_id: int,
        session: Session,
    ) -> ChatRooms:
        statement = select(ChatRooms).where(ChatRooms.id == chat_room_id)
        chat_room = session.exec(statement).first()
        if chat_room is None:
            msg = "ChatRoom not found"
            raise ValueError(msg)

        # 必要に応じて属性を更新
        session.add(chat_room)
        session.commit()
        session.refresh(chat_room)
        return chat_room

    def delete(
        self,
        chat_room_id: int,
        session: Session,
    ) -> ChatRooms:
        statement = select(ChatRooms).where(ChatRooms.id == chat_room_id)
        chat_room = session.exec(statement).first()
        if chat_room is None:
            msg = "ChatRoom not found"
            raise ValueError(msg)

        session.delete(chat_room)
        session.commit()
        return chat_room
