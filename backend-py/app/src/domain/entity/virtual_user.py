"""VirtualUser entity."""

from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKeyConstraint, PrimaryKeyConstraint, Text, Uuid
from sqlmodel import Field, Relationship, SQLModel

from domain.entity._column_types import ts_now

if TYPE_CHECKING:
    from domain.entity.message import Messages
    from domain.entity.user import Users
    from domain.entity.virtual_user_chat import VirtualUserChats
    from domain.entity.virtual_user_profile import VirtualUserProfiles


class VirtualUsers(SQLModel, table=True):
    __tablename__ = "virtual_users"
    __table_args__ = (
        ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            ondelete="CASCADE",
            name="virtual_users_owner_id_users_id_fk",
        ),
        PrimaryKeyConstraint("id", name="virtual_users_pkey"),
    )

    id: uuid.UUID = Field(sa_column=Column("id", Uuid, primary_key=True))
    name: str = Field(sa_column=Column("name", Text, nullable=False))
    owner_id: uuid.UUID = Field(sa_column=Column("owner_id", Uuid, nullable=False))
    created_at: datetime.datetime = Field(sa_column=ts_now())
    updated_at: datetime.datetime = Field(sa_column=ts_now())

    owner: Users | None = Relationship(back_populates="virtual_users")
    messages: list[Messages] = Relationship(back_populates="virtual_user")
    virtual_user_chats: list[VirtualUserChats] = Relationship(
        back_populates="virtual_user"
    )
    virtual_user_profiles: list[VirtualUserProfiles] = Relationship(
        back_populates="virtual_user"
    )
