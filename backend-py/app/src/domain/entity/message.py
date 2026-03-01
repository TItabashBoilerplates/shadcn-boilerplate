"""Message entity."""

from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    Text,
    Uuid,
)
from sqlmodel import Field, Relationship, SQLModel

from domain.entity._column_types import ts_now

if TYPE_CHECKING:
    from domain.entity.chat_room import ChatRooms
    from domain.entity.user import Users
    from domain.entity.virtual_user import VirtualUsers

_SENDER_CHECK = (
    "sender_id IS NOT NULL AND virtual_user_id IS NULL"
    " OR sender_id IS NULL AND virtual_user_id IS NOT NULL"
)


class Messages(SQLModel, table=True):
    __table_args__ = (
        CheckConstraint(_SENDER_CHECK, name="sender_check"),
        ForeignKeyConstraint(
            ["chat_room_id"],
            ["chat_rooms.id"],
            ondelete="CASCADE",
            name="messages_chat_room_id_chat_rooms_id_fk",
        ),
        ForeignKeyConstraint(
            ["sender_id"],
            ["users.id"],
            ondelete="CASCADE",
            name="messages_sender_id_users_id_fk",
        ),
        ForeignKeyConstraint(
            ["virtual_user_id"],
            ["virtual_users.id"],
            ondelete="CASCADE",
            name="messages_virtual_user_id_virtual_users_id_fk",
        ),
        PrimaryKeyConstraint("id", name="messages_pkey"),
    )

    id: int = Field(sa_column=Column("id", Integer, primary_key=True))
    chat_room_id: int = Field(sa_column=Column("chat_room_id", Integer, nullable=False))
    content: str = Field(sa_column=Column("content", Text, nullable=False))
    created_at: datetime.datetime = Field(sa_column=ts_now())
    sender_id: uuid.UUID | None = Field(
        default=None, sa_column=Column("sender_id", Uuid)
    )
    virtual_user_id: uuid.UUID | None = Field(
        default=None, sa_column=Column("virtual_user_id", Uuid)
    )

    chat_room: ChatRooms | None = Relationship(back_populates="messages")
    sender: Users | None = Relationship(back_populates="messages")
    virtual_user: VirtualUsers | None = Relationship(back_populates="messages")
