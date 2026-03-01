"""CorporateUser entity."""

from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Column,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    Text,
    Uuid,
)
from sqlalchemy.sql import text
from sqlmodel import Field, Relationship, SQLModel

from domain.entity._column_types import ts_now

if TYPE_CHECKING:
    from domain.entity.organization import Organizations


class CorporateUsers(SQLModel, table=True):
    __tablename__ = "corporate_users"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
            name="corporate_users_organization_id_organizations_id_fk",
        ),
        PrimaryKeyConstraint("id", name="corporate_users_pkey"),
    )

    id: uuid.UUID = Field(sa_column=Column("id", Uuid, primary_key=True))
    name: str = Field(
        sa_column=Column("name", Text, nullable=False, server_default=text("''::text"))
    )
    organization_id: int = Field(
        sa_column=Column("organization_id", Integer, nullable=False)
    )
    created_at: datetime.datetime = Field(sa_column=ts_now())
    updated_at: datetime.datetime = Field(sa_column=ts_now())

    organization: Organizations | None = Relationship(back_populates="corporate_users")
