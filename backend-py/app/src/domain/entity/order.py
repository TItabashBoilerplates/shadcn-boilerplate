"""Order entity."""

from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Column,
    Enum,
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
    from domain.entity.user import Users


class Orders(SQLModel, table=True):
    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name="orders_user_id_users_id_fk",
        ),
        PrimaryKeyConstraint("id", name="orders_pkey"),
    )

    id: str = Field(sa_column=Column("id", Text, primary_key=True))
    user_id: uuid.UUID = Field(sa_column=Column("user_id", Uuid, nullable=False))
    polar_product_id: str = Field(
        sa_column=Column("polar_product_id", Text, nullable=False)
    )
    polar_price_id: str = Field(
        sa_column=Column("polar_price_id", Text, nullable=False)
    )
    status: str = Field(
        sa_column=Column(
            "status",
            Enum("paid", "refunded", "partially_refunded", name="order_status"),
            nullable=False,
            server_default=text("'paid'::order_status"),
        )
    )
    amount: int = Field(sa_column=Column("amount", Integer, nullable=False))
    currency: str = Field(
        sa_column=Column(
            "currency", Text, nullable=False, server_default=text("'usd'::text")
        )
    )
    created_at: datetime.datetime = Field(sa_column=ts_now())
    updated_at: datetime.datetime = Field(sa_column=ts_now())

    user: Users | None = Relationship(back_populates="orders")
