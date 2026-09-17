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


class TestPoolSizing:
    """Pin how the client-side pool is sized against Supabase's documented limits.

    Supabase numbers this relies on (see db_client for the source links):
      - Nano (Free) and Micro (paid baseline): 60 direct connections,
        200 pooler clients.
      - Transaction mode (pooler port 6543): "Set the pool to 1 connection."
      - Sharing the database with PostgREST: stay under 40% of max connections.
    """

    POOLER_HOST = "aws-0-ap-northeast-1.pooler.supabase.com"
    POOLER_TRANSACTION = f"postgresql://postgres.ref:pw@{POOLER_HOST}:6543/postgres"
    POOLER_SESSION = f"postgresql://postgres.ref:pw@{POOLER_HOST}:5432/postgres"
    DIRECT = "postgresql://postgres:pw@db.ref.supabase.co:5432/postgres"

    def test_transaction_mode_keeps_one_connection_per_instance(self, db_client):
        options = db_client.resolve_pool_options(self.POOLER_TRANSACTION)

        # Supavisor がプラン側の接続を捌くので、インスタンスごとに 1 本だけ温める。
        assert options["pool_size"] == 1
        assert options["max_overflow"] == 0

    def test_direct_connection_stays_within_the_plan_budget(
        self, db_client, monkeypatch
    ):
        monkeypatch.setenv("SB_PLAN", "free")

        options = db_client.resolve_pool_options(self.DIRECT)

        # 60 本の 40% を並走インスタンスで割った値を超えない。
        assert 1 <= options["pool_size"] <= 6
        assert options["max_overflow"] == 0, "予算を超える burst は許さない"

    def test_session_mode_is_pooled_like_a_direct_connection(self, db_client):
        assert (
            db_client.resolve_pool_options(self.POOLER_SESSION)["pool_size"]
            == db_client.resolve_pool_options(self.DIRECT)["pool_size"]
        )

    def test_scaled_compute_raises_the_budget(self, db_client, monkeypatch):
        baseline = db_client.resolve_pool_options(self.DIRECT)["pool_size"]

        monkeypatch.setenv("POSTGRES_MAX_CONNECTIONS", "480")  # 4XL
        assert db_client.resolve_pool_options(self.DIRECT)["pool_size"] > baseline

    def test_explicit_pool_size_wins(self, db_client, monkeypatch):
        monkeypatch.setenv("POSTGRES_POOL_SIZE", "3")

        assert db_client.resolve_pool_options(self.DIRECT)["pool_size"] == 3
        # 明示していても transaction mode の 1 本という上限は崩さない
        assert db_client.resolve_pool_options(self.POOLER_TRANSACTION)["pool_size"] == 1

    def test_unknown_plan_falls_back_to_the_smallest(self, db_client, monkeypatch):
        monkeypatch.setenv("SB_PLAN", "gold")
        fallback = db_client.resolve_pool_options(self.DIRECT)["pool_size"]

        monkeypatch.setenv("SB_PLAN", "free")
        assert fallback == db_client.resolve_pool_options(self.DIRECT)["pool_size"]

    def test_engine_uses_the_resolved_pool(self, db_client, monkeypatch):
        monkeypatch.setenv("POSTGRES_URL", self.DIRECT)
        monkeypatch.setenv("POSTGRES_POOL_SIZE", "4")

        engine = db_client.get_engine()

        assert engine.pool.size() == 4
