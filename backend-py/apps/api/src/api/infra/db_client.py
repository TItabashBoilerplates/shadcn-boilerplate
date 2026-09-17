"""SQLModel engine and session dependency.

Reads the connection string from `POSTGRES_URL` (the canonical env var used
across this monorepo — `env/backend/.env.local` locally, injected by the Vercel
Marketplace Supabase integration in the cloud) and exposes a synchronous
Session via FastAPI dependency injection.

The engine is created **lazily, on first use**. Creating it at import time
makes every code path that merely imports this module — OpenAPI schema
generation, tests, `--help`, `import api.app` — fail when `POSTGRES_URL` is
unset, even though none of them touch the database. Deployment targets also
populate the environment after the process image is built, so the connection
string must be read as late as possible.

SQLModel does not yet have official async support
(see https://github.com/fastapi/sqlmodel/issues/654), so all DB operations
are kept synchronous. Async path operations may still inject this Session;
FastAPI runs the surrounding request handler in a worker thread when needed.
"""

import os
from collections.abc import Generator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import Engine
from sqlmodel import Session, create_engine

from core.exceptions import ConfigurationError


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Return the process-wide engine, creating it on first use.

    Cached because the engine owns the connection pool: building one per
    request would open a new pool per request.
    """
    postgres_url = os.getenv("POSTGRES_URL")
    if not postgres_url:
        msg = "POSTGRES_URL environment variable is not set"
        raise ConfigurationError(msg)

    # `SQL_ECHO=1` enables verbose query logging — off by default to avoid
    # leaking values into structured logs in production.
    sql_echo = os.getenv("SQL_ECHO", "").lower() in {"1", "true", "yes"}

    return create_engine(
        postgres_url,
        echo=sql_echo,
        # Supabase's pooler drops idle connections; never hand a dead one out.
        pool_pre_ping=True,
    )


def reset_engine() -> None:
    """Dispose the cached engine so the next call re-reads the environment."""
    if get_engine.cache_info().currsize:
        get_engine().dispose()
    get_engine.cache_clear()


def get_session() -> Generator[Session]:
    """Yield a SQLModel Session scoped to the current request."""
    with Session(get_engine()) as session:
        yield session


DBSessionDep = Annotated[Session, Depends(get_session)]
