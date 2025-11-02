from sqlmodel import Session, select

from src.domain.entity.models import Messages


class MessageGateway:
    def create(
        self,
        chat_room_id: int,
        virtual_sender_id: str,
        content: str,
        session: Session,
    ) -> Messages:
        message = Messages(
            chat_room_id=chat_room_id,
            virtual_user_id=virtual_sender_id,
            content=content,
        )
        session.add(message)
        session.commit()
        session.refresh(message)
        return message

    def get_by_id(
        self,
        message_id: int,
        session: Session,
    ) -> Messages | None:
        statement = select(Messages).where(Messages.id == message_id)
        return session.exec(statement).first()

    def get_all_by_chat_room_id(
        self,
        chat_room_id: int,
        session: Session,
    ) -> list[Messages]:
        statement = select(Messages).where(Messages.chat_room_id == chat_room_id)
        return list(session.exec(statement).all())

    def update(
        self,
        message_id: int,
        content: str,
        session: Session,
    ) -> Messages:
        statement = select(Messages).where(Messages.id == message_id)
        message = session.exec(statement).first()
        if message is None:
            raise ValueError("Message not found")

        message.content = content
        session.add(message)
        session.commit()
        session.refresh(message)
        return message

    def delete(
        self,
        message_id: int,
        session: Session,
    ) -> Messages:
        statement = select(Messages).where(Messages.id == message_id)
        message = session.exec(statement).first()
        if message is None:
            raise ValueError("Message not found")

        session.delete(message)
        session.commit()
        return message
