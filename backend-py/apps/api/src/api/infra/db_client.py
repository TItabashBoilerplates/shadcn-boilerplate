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

The client-side pool is sized against the limits the Supabase plan actually
gives the project, because every connection this process holds is one the rest
of the stack (PostgREST, Auth, Storage, migrations) cannot use:

- Free runs on Nano and the paid baseline is Micro; both allow **60 direct
  connections and 200 pooler clients**. Scaling compute raises that (Small 90,
  Medium 120, ... 16XL 500), so a scaled project sets
  `POSTGRES_MAX_CONNECTIONS` to the documented number for its compute size.
- Supabase advises staying under **40% of the max connections** when PostgREST
  shares the database, which is always the case here (`supabase-first.md`).
- Through the **transaction-mode pooler** (port 6543) Supavisor already pools
  on the plan's behalf, and Supabase's guidance is to "set the pool to 1
  connection" per warm instance. Note that transaction mode does not support
  prepared statements; psycopg2 does not use server-side prepares, so nothing
  has to be turned off today — a driver swap (psycopg3 / asyncpg) would need it.

Sources:
- https://supabase.com/docs/guides/platform/compute-and-disk (connection limits)
- https://supabase.com/docs/guides/database/connection-management (40% / 80%)
- https://supabase.com/docs/guides/database/connecting-to-postgres (pooler modes)

SQLModel does not yet have official async support
(see https://github.com/fastapi/sqlmodel/issues/654), so all DB operations
are kept synchronous. Async path operations may still inject this Session;
FastAPI runs the surrounding request handler in a worker thread when needed.
"""

import os
from collections.abc import Generator
from functools import lru_cache
from typing import Annotated, Any
from urllib.parse import urlparse

from fastapi import Depends
from sqlalchemy import Engine
from sqlmodel import Session, create_engine

from core.exceptions import ConfigurationError
from core.logging import get_logger

logger = get_logger(__name__)

# Direct connections allowed by the compute size each plan starts on
# (Free is pinned to Nano; paid plans default to Micro and can scale up).
PLAN_MAX_CONNECTIONS: dict[str, int] = {
    "free": 60,  # Nano
    "pro": 60,  # Micro
    "team": 60,  # Micro
    "enterprise": 60,  # negotiated; assume the baseline until told otherwise
}
SMALLEST_PLAN = "free"

# Share of the database's connections this service may claim. Supabase: stay
# under 40% when PostgREST is also hitting the same database.
CONNECTION_BUDGET_RATIO = 0.4

# The budget is per database, not per process, and this API scales out to
# several instances. Split the budget so one instance cannot drain it.
ASSUMED_INSTANCES = 4

# Supavisor transaction mode. Supabase: "Set the pool to 1 connection."
TRANSACTION_POOLER_PORT = 6543
TRANSACTION_POOL_SIZE = 1

# Wait this long for a free connection before failing the request. SQLAlchemy's
# 30s default outlives most client timeouts, turning saturation into a hang.
POOL_TIMEOUT_SECONDS = 10


def _plan_max_connections() -> int:
    """Connections the project's plan allows, or the override for scaled compute."""
    override = os.getenv("POSTGRES_MAX_CONNECTIONS")
    if override:
        return _positive_int(override, "POSTGRES_MAX_CONNECTIONS")

    plan = os.getenv("SB_PLAN", SMALLEST_PLAN).strip().lower()
    if plan not in PLAN_MAX_CONNECTIONS:
        logger.warning(
            "Unknown SB_PLAN, assuming the smallest plan",
            plan=plan,
            assumed=SMALLEST_PLAN,
        )
        plan = SMALLEST_PLAN
    return PLAN_MAX_CONNECTIONS[plan]


def _positive_int(raw: str, name: str) -> int:
    try:
        value = int(raw)
    except ValueError as exc:
        msg = f"{name} must be an integer, got {raw!r}"
        raise ConfigurationError(msg) from exc
    if value < 1:
        msg = f"{name} must be >= 1, got {value}"
        raise ConfigurationError(msg)
    return value


def _is_transaction_pooler(postgres_url: str) -> bool:
    """True when the URL points at Supavisor's transaction-mode port."""
    try:
        return urlparse(postgres_url).port == TRANSACTION_POOLER_PORT
    except ValueError:  # malformed port — let create_engine report it
        return False


def resolve_pool_options(postgres_url: str) -> dict[str, Any]:
    """Pool settings for this URL under the project's Supabase plan."""
    if _is_transaction_pooler(postgres_url):
        # Supavisor holds the real connections; keeping more here only burns
        # the plan's client slots (200 on Nano/Micro) once instances scale out.
        pool_size = TRANSACTION_POOL_SIZE
    else:
        budget = int(_plan_max_connections() * CONNECTION_BUDGET_RATIO)
        default_size = max(1, budget // ASSUMED_INSTANCES)
        override = os.getenv("POSTGRES_POOL_SIZE")
        pool_size = (
            _positive_int(override, "POSTGRES_POOL_SIZE") if override else default_size
        )

    return {
        "pool_size": pool_size,
        # Overflow would push the process past the budget exactly when the
        # database is busiest. Queue instead, and fail fast if that queue stalls.
        "max_overflow": 0,
        "pool_timeout": POOL_TIMEOUT_SECONDS,
        # Supabase's pooler drops idle connections; never hand a dead one out.
        "pool_pre_ping": True,
    }


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

    pool_options = resolve_pool_options(postgres_url)
    logger.info("Creating database engine", **pool_options)

    return create_engine(postgres_url, echo=sql_echo, **pool_options)


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
