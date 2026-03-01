"""User entity."""

from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Column, PrimaryKeyConstraint, Text, UniqueConstraint, Uuid
from sqlalchemy.sql import text
from sqlmodel import Field, Relationship, SQLModel

from domain.entity._column_types import ts_now

if TYPE_CHECKING:
    from domain.entity.message import Messages
    from domain.entity.order import Orders
    from domain.entity.subscription import Subscriptions
    from domain.entity.user_chat import UserChats
    from domain.entity.user_profile import UserProfiles
    from domain.entity.virtual_user import VirtualUsers


class Users(SQLModel, table=True):
    __table_args__ = (
        PrimaryKeyConstraint("id", name="users_pkey"),
        UniqueConstraint("account_name", name="users_account_name_unique"),
    )

    id: uuid.UUID = Field(sa_column=Column("id", Uuid, primary_key=True))
    display_name: str = Field(
        sa_column=Column(
            "display_name", Text, nullable=False, server_default=text("''::text")
        )
    )
    account_name: str = Field(sa_column=Column("account_name", Text, nullable=False))
    created_at: datetime.datetime = Field(sa_column=ts_now())
    updated_at: datetime.datetime = Field(sa_column=ts_now())

    orders: list[Orders] = Relationship(back_populates="user")
    subscriptions: list[Subscriptions] = Relationship(back_populates="user")
    user_chats: list[UserChats] = Relationship(back_populates="user")
    user_profiles: UserProfiles | None = Relationship(
        sa_relationship_kwargs={"uselist": False}, back_populates="user"
    )
    virtual_users: list[VirtualUsers] = Relationship(back_populates="owner")
    messages: list[Messages] = Relationship(back_populates="sender")
