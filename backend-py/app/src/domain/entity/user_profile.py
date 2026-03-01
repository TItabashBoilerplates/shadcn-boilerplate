"""UserProfile entity."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Column,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.sql import text
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from domain.entity.address import Addresses
    from domain.entity.user import Users


class UserProfiles(SQLModel, table=True):
    __tablename__ = "user_profiles"
    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name="user_profiles_user_id_users_id_fk",
        ),
        PrimaryKeyConstraint("id", name="user_profiles_pkey"),
        UniqueConstraint("email", name="user_profiles_email_unique"),
        UniqueConstraint(
            "polar_customer_id", name="user_profiles_polar_customer_id_unique"
        ),
        UniqueConstraint("user_id", name="user_profiles_user_id_unique"),
    )

    id: int = Field(sa_column=Column("id", Integer, primary_key=True))
    first_name: str = Field(
        sa_column=Column(
            "first_name", Text, nullable=False, server_default=text("''::text")
        )
    )
    last_name: str = Field(
        sa_column=Column(
            "last_name", Text, nullable=False, server_default=text("''::text")
        )
    )
    user_id: uuid.UUID = Field(sa_column=Column("user_id", Uuid, nullable=False))
    email: str = Field(sa_column=Column("email", Text, nullable=False))
    phone_number: str | None = Field(
        default=None, sa_column=Column("phone_number", Text)
    )
    polar_customer_id: str | None = Field(
        default=None, sa_column=Column("polar_customer_id", Text)
    )

    user: Users | None = Relationship(back_populates="user_profiles")
    addresses: Addresses | None = Relationship(
        sa_relationship_kwargs={"uselist": False}, back_populates="profile"
    )
