"""Shared SQLAlchemy column type helpers for SQLModel entities."""

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import text


def ts_now() -> Column:  # type: ignore[type-arg]
    """TIMESTAMP WITH TIME ZONE, precision 3, default now()."""
    return Column(
        TIMESTAMP(timezone=True, precision=3),
        nullable=False,
        server_default=text("now()"),
    )


def ts_nullable() -> Column:  # type: ignore[type-arg]
    """Nullable TIMESTAMP WITH TIME ZONE, precision 3."""
    return Column(TIMESTAMP(timezone=True, precision=3))
