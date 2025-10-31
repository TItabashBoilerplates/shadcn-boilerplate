from sqlmodel import Session, select

from src.domain.entity.models import ChatRoom, ChatType, UserChat


class ChatRoomGateway:
    def create(
        self,
        user_id: str,
        session: Session,
    ) -> ChatRoom:
        # チャットルームを作成
        chat_room = ChatRoom(type=ChatType.PRIVATE)
        session.add(chat_room)
        session.commit()
        session.refresh(chat_room)

        # ユーザチャットの関連を作成
        user_chat = UserChat(user_id=user_id, chat_room_id=chat_room.id)
        session.add(user_chat)
        session.commit()

        return chat_room

    def get_by_id(
        self,
        chat_room_id: int,
        session: Session,
    ) -> ChatRoom | None:
        statement = select(ChatRoom).where(ChatRoom.id == chat_room_id)
        return session.exec(statement).first()

    def get_all_by_user_id(
        self,
        user_id: str,
        session: Session,
    ) -> list[ChatRoom]:
        # UserChatを経由してChatRoomを取得
        statement = (
            select(ChatRoom)
            .join(UserChat)
            .where(UserChat.user_id == user_id)
        )
        return list(session.exec(statement).all())

    def update(
        self,
        chat_room_id: int,
        session: Session,
    ) -> ChatRoom:
        statement = select(ChatRoom).where(ChatRoom.id == chat_room_id)
        chat_room = session.exec(statement).first()
        if chat_room is None:
            raise ValueError("ChatRoom not found")

        # 必要に応じて属性を更新
        session.add(chat_room)
        session.commit()
        session.refresh(chat_room)
        return chat_room

    def delete(
        self,
        chat_room_id: int,
        session: Session,
    ) -> ChatRoom:
        statement = select(ChatRoom).where(ChatRoom.id == chat_room_id)
        chat_room = session.exec(statement).first()
        if chat_room is None:
            raise ValueError("ChatRoom not found")

        session.delete(chat_room)
        session.commit()
        return chat_room
