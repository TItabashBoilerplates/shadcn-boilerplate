"""Subscription entity."""

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

from domain.entity._column_types import ts_now, ts_nullable

if TYPE_CHECKING:
    from domain.entity.user import Users


class Subscriptions(SQLModel, table=True):
    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name="subscriptions_user_id_users_id_fk",
        ),
        PrimaryKeyConstraint("id", name="subscriptions_pkey"),
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
            Enum(
                "active",
                "canceled",
                "incomplete",
                "incomplete_expired",
                "past_due",
                "trialing",
                "unpaid",
                name="subscription_status",
            ),
            nullable=False,
            server_default=text("'incomplete'::subscription_status"),
        )
    )
    cancel_at_period_end: int = Field(
        sa_column=Column(
            "cancel_at_period_end", Integer, nullable=False, server_default=text("0")
        )
    )
    created_at: datetime.datetime = Field(sa_column=ts_now())
    updated_at: datetime.datetime = Field(sa_column=ts_now())
    current_period_start: datetime.datetime | None = Field(
        default=None, sa_column=ts_nullable()
    )
    current_period_end: datetime.datetime | None = Field(
        default=None, sa_column=ts_nullable()
    )

    user: Users | None = Relationship(back_populates="subscriptions")
