"""Organization entity."""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, Relationship, SQLModel

from domain.entity._column_types import ts_now

if TYPE_CHECKING:
    from domain.entity.corporate_user import CorporateUsers


class Organizations(SQLModel, table=True):
    __table_args__ = (PrimaryKeyConstraint("id", name="organizations_pkey"),)

    id: int = Field(sa_column=Column("id", Integer, primary_key=True))
    name: str = Field(sa_column=Column("name", Text, nullable=False))
    created_at: datetime.datetime = Field(sa_column=ts_now())
    updated_at: datetime.datetime = Field(sa_column=ts_now())

    corporate_users: list[CorporateUsers] = Relationship(back_populates="organization")
