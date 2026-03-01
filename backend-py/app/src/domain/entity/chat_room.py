"""ChatRoom entity."""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, Enum, Integer, PrimaryKeyConstraint
from sqlmodel import Field, Relationship, SQLModel

from domain.entity._column_types import ts_now

if TYPE_CHECKING:
    from domain.entity.message import Messages
    from domain.entity.user_chat import UserChats
    from domain.entity.virtual_user_chat import VirtualUserChats


class ChatRooms(SQLModel, table=True):
    __tablename__ = "chat_rooms"
    __table_args__ = (PrimaryKeyConstraint("id", name="chat_rooms_pkey"),)

    id: int = Field(sa_column=Column("id", Integer, primary_key=True))
    type: str = Field(
        sa_column=Column(
            "type",
            Enum("PRIVATE", "GROUP", name="chat_type"),
            nullable=False,
        )
    )
    created_at: datetime.datetime = Field(sa_column=ts_now())

    user_chats: list[UserChats] = Relationship(back_populates="chat_room")
    messages: list[Messages] = Relationship(back_populates="chat_room")
    virtual_user_chats: list[VirtualUserChats] = Relationship(
        back_populates="chat_room"
    )
