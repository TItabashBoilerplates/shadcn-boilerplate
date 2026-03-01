"""UserChat entity."""

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
    from domain.entity.user import Users


class UserChats(SQLModel, table=True):
    __tablename__ = "user_chats"
    __table_args__ = (
        ForeignKeyConstraint(
            ["chat_room_id"],
            ["chat_rooms.id"],
            ondelete="CASCADE",
            name="user_chats_chat_room_id_chat_rooms_id_fk",
        ),
        ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name="user_chats_user_id_users_id_fk",
        ),
        PrimaryKeyConstraint("id", name="user_chats_pkey"),
        Index(
            "user_chats_user_id_chat_room_id_key",
            "user_id",
            "chat_room_id",
            unique=True,
        ),
    )

    id: int = Field(sa_column=Column("id", Integer, primary_key=True))
    user_id: uuid.UUID = Field(sa_column=Column("user_id", Uuid, nullable=False))
    chat_room_id: int = Field(sa_column=Column("chat_room_id", Integer, nullable=False))

    chat_room: ChatRooms | None = Relationship(back_populates="user_chats")
    user: Users | None = Relationship(back_populates="user_chats")
