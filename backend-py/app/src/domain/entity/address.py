"""Address entity."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
    Column,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
)
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from domain.entity.user_profile import UserProfiles


class Addresses(SQLModel, table=True):
    __table_args__ = (
        ForeignKeyConstraint(
            ["profile_id"],
            ["user_profiles.id"],
            ondelete="CASCADE",
            name="addresses_profile_id_user_profiles_id_fk",
        ),
        PrimaryKeyConstraint("id", name="addresses_pkey"),
        UniqueConstraint("profile_id", name="addresses_profile_id_unique"),
    )

    id: int = Field(sa_column=Column("id", Integer, primary_key=True))
    street: str = Field(sa_column=Column("street", Text, nullable=False))
    city: str = Field(sa_column=Column("city", Text, nullable=False))
    state: str = Field(sa_column=Column("state", Text, nullable=False))
    postal_code: str = Field(sa_column=Column("postal_code", Text, nullable=False))
    country: str = Field(sa_column=Column("country", Text, nullable=False))
    profile_id: int | None = Field(
        default=None, sa_column=Column("profile_id", Integer)
    )

    profile: UserProfiles | None = Relationship(back_populates="addresses")
