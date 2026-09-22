"""Every FastAPI route must be reachable through the root vercel.json rewrites.

web (Next.js) と api (この FastAPI コンテナ) は同じ Vercel project の services で、
リポジトリルートの ``vercel.json`` の top-level rewrite が **先勝ち** でパスを
振り分ける (https://vercel.com/docs/services/routing)。末尾の ``/(.*)`` は web 行き。

したがって ``/api`` の外に生やしたルート (``/users`` など) は **公開ドメインからは
web に吸われて 404 になる**。ローカルの devenv は別ポートで api を直接叩くので
再現せず、テストも型も lint も通る。ここで静的に止める。

新しいルーターは ``APIRouter(prefix="/api/...")`` で作ること。
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import pytest
from fastapi.routing import APIRoute

REPO_ROOT = Path(__file__).resolve().parents[4]
VERCEL_JSON = REPO_ROOT / "vercel.json"
SERVICE = "api"


def _rewrites() -> list[dict[str, Any]]:
    config = json.loads(VERCEL_JSON.read_text(encoding="utf-8"))
    return list(config.get("rewrites", []))


def _service_for(path: str) -> str | None:
    """Return the service of the first rewrite whose source matches (first wins)."""
    hit = next(
        (rule for rule in _rewrites() if re.fullmatch(str(rule["source"]), path)),
        None,
    )
    destination = (hit or {}).get("destination")
    return str(destination["service"]) if isinstance(destination, dict) else None


def _concrete(path: str) -> str:
    """Replace path parameters so the path can be matched against rewrites."""
    return re.sub(r"\{[^}]+\}", "x", path)


def _routes() -> list[str]:
    os.environ.setdefault(
        "POSTGRES_URL",
        "postgresql://postgres:postgres@localhost:54322/postgres",
    )
    os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
    os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "test-key")

    from api.app import app

    return sorted({route.path for route in app.routes if isinstance(route, APIRoute)})


def test_routes_are_collected() -> None:
    """検査対象が 0 件なら, 下のテストは無言で空回りしている."""
    assert _routes()


@pytest.mark.parametrize("path", _routes())
def test_route_is_rewritten_to_api(path: str) -> None:
    """公開ドメインで叩いたとき, そのルートが api service に届くこと."""
    assert _service_for(_concrete(path)) == SERVICE, (
        f"{path} は vercel.json の rewrite で {SERVICE} に届かない (web に吸われる)。"
        ' APIRouter(prefix="/api/...") の下に置くか、vercel.json に rewrite を足すこと'
    )


def test_openapi_schema_is_rewritten_to_api() -> None:
    """Hey API の生成元 (/openapi.json) も公開ドメインから取れること."""
    assert _service_for("/openapi.json") == SERVICE
