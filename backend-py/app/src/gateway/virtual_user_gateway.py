import uuid
from datetime import datetime

from sqlmodel import Session, select

from src.domain.entity.models import VirtualUser


class VirtualUserGateway:
    def create(
        self,
        name: str,
        owner_id: str,
        session: Session,
    ) -> VirtualUser:
        virtual_user = VirtualUser(
            id=str(uuid.uuid4()),
            name=name,
            owner_id=owner_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        session.add(virtual_user)
        session.commit()
        session.refresh(virtual_user)
        return virtual_user

    def get_by_id(
        self,
        virtual_user_id: str,
        session: Session,
    ) -> VirtualUser | None:
        statement = select(VirtualUser).where(VirtualUser.id == virtual_user_id)
        return session.exec(statement).first()

    def get_all(self, session: Session) -> list[VirtualUser]:
        statement = select(VirtualUser)
        return list(session.exec(statement).all())

    def get_by_owner_id(
        self,
        owner_id: str,
        session: Session,
    ) -> list[VirtualUser]:
        statement = select(VirtualUser).where(VirtualUser.owner_id == owner_id)
        return list(session.exec(statement).all())

    def update(
        self,
        virtual_user_id: str,
        name: str,
        session: Session,
    ) -> VirtualUser:
        statement = select(VirtualUser).where(VirtualUser.id == virtual_user_id)
        virtual_user = session.exec(statement).first()
        if virtual_user is None:
            raise ValueError("VirtualUser not found")

        virtual_user.name = name
        virtual_user.updated_at = datetime.now()
        session.add(virtual_user)
        session.commit()
        session.refresh(virtual_user)
        return virtual_user

    def delete(
        self,
        virtual_user_id: str,
        session: Session,
    ) -> VirtualUser:
        statement = select(VirtualUser).where(VirtualUser.id == virtual_user_id)
        virtual_user = session.exec(statement).first()
        if virtual_user is None:
            raise ValueError("VirtualUser not found")

        session.delete(virtual_user)
        session.commit()
        return virtual_user
