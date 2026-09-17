"""Pin the DB connection contract: a lazy engine built from POSTGRES_URL.

Building the engine at import time takes down every path that merely imports
this module: OpenAPI schema generation, the test suite, `--help` and
`import api.app` all fail when POSTGRES_URL is unset, even though none of them
touch the database. Deployment targets populate the environment after the
process image is built, so the connection string is read on first use instead.
"""

import importlib

import pytest

from core.exceptions import ConfigurationError

LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


@pytest.fixture
def db_client(monkeypatch):
    """Reload db_client with POSTGRES_URL removed from the environment."""
    monkeypatch.delenv("POSTGRES_URL", raising=False)
    monkeypatch.delenv("SQL_ECHO", raising=False)

    module = importlib.reload(importlib.import_module("api.infra.db_client"))
    yield module
    module.reset_engine()


def test_import_does_not_require_postgres_url(db_client):
    # Reaching here means the reload itself did not raise.
    assert db_client.get_engine is not None


def test_engine_creation_fails_loudly_without_postgres_url(db_client):
    with pytest.raises(ConfigurationError, match="POSTGRES_URL"):
        db_client.get_engine()


def test_engine_reads_postgres_url_on_first_use(db_client, monkeypatch):
    monkeypatch.setenv("POSTGRES_URL", LOCAL_URL)

    engine = db_client.get_engine()

    assert engine.url.database == "postgres"
    assert engine.url.port == 54322
    # The second call must reuse it: one pool per process, not per request.
    assert db_client.get_engine() is engine


def test_reset_engine_rereads_the_environment(db_client, monkeypatch):
    monkeypatch.setenv("POSTGRES_URL", LOCAL_URL)
    first = db_client.get_engine()

    db_client.reset_engine()
    monkeypatch.setenv("POSTGRES_URL", LOCAL_URL.replace("54322", "6543"))
    second = db_client.get_engine()

    assert second is not first
    assert second.url.port == 6543


def test_sql_echo_is_off_unless_explicitly_enabled(db_client, monkeypatch):
    monkeypatch.setenv("POSTGRES_URL", LOCAL_URL)
    assert db_client.get_engine().echo is False

    db_client.reset_engine()
    monkeypatch.setenv("SQL_ECHO", "1")
    assert db_client.get_engine().echo is True
