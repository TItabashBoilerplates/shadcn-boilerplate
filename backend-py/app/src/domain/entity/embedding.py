"""Embedding entity."""

from __future__ import annotations

import datetime
from typing import Any

from sqlalchemy import Column, PrimaryKeyConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql.sqltypes import NullType
from sqlmodel import Field, SQLModel

from domain.entity._column_types import ts_now


class Embeddings(SQLModel, table=True):
    __table_args__ = (PrimaryKeyConstraint("id", name="embeddings_pkey"),)

    id: str = Field(sa_column=Column("id", Text, primary_key=True))
    embedding: Any = Field(sa_column=Column("embedding", NullType, nullable=False))
    content: str = Field(sa_column=Column("content", Text, nullable=False))
    metadata_: dict[str, Any] = Field(
        sa_column=Column("metadata", JSONB, nullable=False)
    )
    created_at: datetime.datetime = Field(sa_column=ts_now())
    updated_at: datetime.datetime = Field(sa_column=ts_now())
