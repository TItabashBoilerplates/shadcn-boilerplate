"""VirtualUserChat entity."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Column,
    ForeignKeyConstraint,
    Index,
    Integer,
    PrimaryKeyConstraint,
    Uuid,
)
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from domain.entity.chat_room import ChatRooms
    from domain.entity.virtual_user import VirtualUsers


class VirtualUserChats(SQLModel, table=True):
    __tablename__ = "virtual_user_chats"
    __table_args__ = (
        ForeignKeyConstraint(
            ["chat_room_id"],
            ["chat_rooms.id"],
            ondelete="CASCADE",
            name="virtual_user_chats_chat_room_id_chat_rooms_id_fk",
        ),
        ForeignKeyConstraint(
            ["virtual_user_id"],
            ["virtual_users.id"],
            ondelete="CASCADE",
            name="virtual_user_chats_virtual_user_id_virtual_users_id_fk",
        ),
        PrimaryKeyConstraint("id", name="virtual_user_chats_pkey"),
        Index(
            "virtual_user_chats_virtual_user_id_chat_room_id_key",
            "virtual_user_id",
            "chat_room_id",
            unique=True,
        ),
    )

    id: int = Field(sa_column=Column("id", Integer, primary_key=True))
    virtual_user_id: uuid.UUID = Field(
        sa_column=Column("virtual_user_id", Uuid, nullable=False)
    )
    chat_room_id: int = Field(sa_column=Column("chat_room_id", Integer, nullable=False))

    chat_room: ChatRooms | None = Relationship(back_populates="virtual_user_chats")
    virtual_user: VirtualUsers | None = Relationship(
        back_populates="virtual_user_chats"
    )
