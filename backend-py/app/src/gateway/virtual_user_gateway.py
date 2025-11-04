import uuid
from datetime import UTC, datetime
from uuid import UUID

from sqlmodel import Session, select

from domain.entity.models import VirtualUsers


class VirtualUserGateway:
    def create(
        self,
        name: str,
        owner_id: UUID,
        session: Session,
    ) -> VirtualUsers:
        virtual_user = VirtualUsers(
            id=uuid.uuid4(),
            name=name,
            owner_id=owner_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(virtual_user)
        session.commit()
        session.refresh(virtual_user)
        return virtual_user

    def get_by_id(
        self,
        virtual_user_id: UUID,
        session: Session,
    ) -> VirtualUsers | None:
        statement = select(VirtualUsers).where(VirtualUsers.id == virtual_user_id)
        return session.exec(statement).first()

    def get_all(self, session: Session) -> list[VirtualUsers]:
        statement = select(VirtualUsers)
        return list(session.exec(statement).all())

    def get_by_owner_id(
        self,
        owner_id: UUID,
        session: Session,
    ) -> list[VirtualUsers]:
        statement = select(VirtualUsers).where(VirtualUsers.owner_id == owner_id)
        return list(session.exec(statement).all())

    def update(
        self,
        virtual_user_id: UUID,
        name: str,
        session: Session,
    ) -> VirtualUsers:
        statement = select(VirtualUsers).where(VirtualUsers.id == virtual_user_id)
        virtual_user = session.exec(statement).first()
        if virtual_user is None:
            msg = "VirtualUser not found"
            raise ValueError(msg)

        virtual_user.name = name
        virtual_user.updated_at = datetime.now(UTC)
        session.add(virtual_user)
        session.commit()
        session.refresh(virtual_user)
        return virtual_user

    def delete(
        self,
        virtual_user_id: UUID,
        session: Session,
    ) -> VirtualUsers:
        statement = select(VirtualUsers).where(VirtualUsers.id == virtual_user_id)
        virtual_user = session.exec(statement).first()
        if virtual_user is None:
            msg = "VirtualUser not found"
            raise ValueError(msg)

        session.delete(virtual_user)
        session.commit()
        return virtual_user
