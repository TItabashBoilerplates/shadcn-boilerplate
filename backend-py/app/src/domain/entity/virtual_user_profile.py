"""VirtualUserProfile entity."""

from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    ARRAY,
    Column,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import text
from sqlmodel import Field, Relationship, SQLModel

from domain.entity._column_types import ts_now

if TYPE_CHECKING:
    from domain.entity.virtual_user import VirtualUsers


class VirtualUserProfiles(SQLModel, table=True):
    __tablename__ = "virtual_user_profiles"
    __table_args__ = (
        ForeignKeyConstraint(
            ["virtual_user_id"],
            ["virtual_users.id"],
            ondelete="CASCADE",
            name="virtual_user_profiles_virtual_user_id_virtual_users_id_fk",
        ),
        PrimaryKeyConstraint("id", name="virtual_user_profiles_pkey"),
    )

    id: int = Field(sa_column=Column("id", Integer, primary_key=True))
    personality: str = Field(
        sa_column=Column(
            "personality",
            Text,
            nullable=False,
            server_default=text("'friendly'::text"),
        )
    )
    tone: str = Field(
        sa_column=Column(
            "tone", Text, nullable=False, server_default=text("'casual'::text")
        )
    )
    knowledge_area: list[str] = Field(
        sa_column=Column("knowledge_area", ARRAY(Text()), nullable=False)
    )
    backstory: str = Field(
        sa_column=Column(
            "backstory", Text, nullable=False, server_default=text("''::text")
        )
    )
    virtual_user_id: uuid.UUID = Field(
        sa_column=Column("virtual_user_id", Uuid, nullable=False)
    )
    created_at: datetime.datetime = Field(sa_column=ts_now())
    updated_at: datetime.datetime = Field(sa_column=ts_now())
    quirks: str | None = Field(
        default=None,
        sa_column=Column("quirks", Text, server_default=text("''::text")),
    )
    knowledge: dict[str, Any] | None = Field(
        default=None, sa_column=Column("knowledge", JSONB)
    )

    virtual_user: VirtualUsers | None = Relationship(
        back_populates="virtual_user_profiles"
    )
