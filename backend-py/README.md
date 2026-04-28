# Backend Python (FastAPI)

FastAPI + Supabase auth スケルトン。Clean Architecture のレイヤー構成のみ提供する最小ボイラープレート。ドメインエンティティや UseCase / Gateway / 外部サービス連携（LLM、ベクトル検索、WebRTC など）はあらかじめ含めず、必要になったらこのスケルトンを起点に実装する。

## Overview

このバックエンドは **Clean Architecture** のレイヤー分離を前提に最小構成で立ち上がる。立ち上げ時点で動くのは以下のみ:

- `GET /healthcheck` (auth 不要)
- Supabase JWT を検証する `verify_token` 依存（`middleware/auth_middleware.py`）
- structlog ベースの構造化ロギング（dev: 色付き / prod: JSON）
- リクエストログ middleware（`logging_middleware.py`）
- DB / Supabase クライアントの初期化ヘルパ（`infra/db_client.py` / `infra/supabase_client.py`）
- 例外クラスのテンプレート（`domain/exceptions.py`）

## Tech Stack

- **Framework**: FastAPI
- **Architecture**: Clean Architecture (Controller / UseCase / Gateway / Domain / Infra)
- **ORM**: SQLModel (Sync)
- **Database**: PostgreSQL (Supabase)
- **Package Manager**: uv
- **Code Quality**: Ruff (lint+format), MyPy (strict), pytest

## Directory Layout

```
backend-py/app/src/
├── controller/
│   ├── __init__.py          # ルーター集約
│   └── base_controller.py   # 現状は GET /healthcheck のみ
├── usecase/                 # ビジネスロジック (空)
├── gateway/                 # データアクセス抽象 (空)
├── domain/
│   ├── entity/              # SQLModel エンティティ (空 — 必要に応じて追加)
│   ├── service/             # ドメインサービス (空)
│   ├── const/error_messages.py
│   └── exceptions.py        # AuthenticationError / ResourceNotFoundError / ConfigurationError
├── infra/
│   ├── db_client.py         # SQLModel session 管理 (Depends で注入)
│   └── supabase_client.py   # Supabase Auth クライアント
├── middleware/
│   ├── auth_middleware.py   # Bearer token 検証 (Supabase 経由)
│   └── logging_middleware.py
├── util/
│   └── logging.py           # structlog 設定 (dev / prod 切替)
└── app.py                   # FastAPI エントリポイント
```

## Layer Responsibilities

| Layer | 責務 |
|---|---|
| **Controller** | HTTP の入出力のみ。ビジネスロジックは持たない |
| **UseCase** | 複数 Gateway を協調させてビジネスフローを実装 |
| **Gateway** | データアクセスを抽象化（Sync SQLModel + 外部 API 呼び出し） |
| **Domain** | Entity / Service / 例外 / 定数。外部依存を持たない |
| **Infrastructure** | DB / Supabase / 外部サービスクライアント |
| **Middleware** | 認証 / ロギング / CORS など横断的関心事 |

エンティティを追加するときは `domain/entity/` 配下に SQLModel を置き、`domain/entity/__init__.py` で import 順を制御する（FK 依存があるため base から順に）。

## Adding a New Endpoint (例)

```python
# controller/users_controller.py
from typing import Annotated

from fastapi import APIRouter, Depends
from supabase_auth.types import User

from middleware.auth_middleware import verify_token

router = APIRouter()


@router.get("/me")
async def me(current_user: Annotated[User, Depends(verify_token)]) -> dict[str, str | None]:
    return {"id": current_user.id, "email": current_user.email}
```

その後 `controller/__init__.py` で `include_router(...)` する。Bearer token は `verify_token` の Dependency で検証され、Supabase の `User` が `Depends` で受け取れる。

## Development

すべて devenv の **scripts** (PATH 直結) または **tasks** (`devenv tasks run <name>`) を使用する。Makefile は **deprecated**。直接 `uv run X` / `cd backend-py && ...` での実行は禁止。

### Getting Started

```bash
# Setup
# `devenv shell` 進入 (direnv 経由含む) で setup:install-backend task が
# uv sync --frozen --group dev を自動実行する。明示的な init コマンドは不要。

# Start backend services (軽量セット = Supabase + backend + storybook)
devenv up
# 別組み合わせ: dev-web / dev-mobile / dev-all / `devenv up backend web` 等
```

### Common Commands

```bash
# Linting & Formatting
lint-backend-py              # Ruff lint (auto-fix)
lint-backend-py-ci           # Ruff lint (CI, no fix)
format-backend-py            # Ruff format (auto-fix)
format-backend-py-check      # Ruff format check

# Type Checking
type-check-backend-py        # MyPy (strict mode)

# Testing
test-backend-py              # pytest 単体
test                         # 全 unit test (frontend + backend-py)

# 詳細な pytest オプション (devenv shell 内で uv 経由)
cd "$DEVENV_ROOT/backend-py/app"
uv run pytest --cov          # Run with coverage
uv run pytest -v             # Verbose
uv run pytest -k test_name   # Run specific test
```

正典: `/.claude/rules/commands.md`

### Package Management (uv)

```bash
cd backend-py/app

uv sync                # インストール
uv sync --no-dev       # production のみ
uv add <package>       # 追加
uv add --dev <package> # dev 依存追加
uv lock --upgrade      # ロック更新
```

LLM / ベクトル検索 / WebRTC など重い依存は最初から積まない方針。必要になった時点で `uv add` で導入する（プロジェクト全体のポリシーは `.claude/rules/supabase-first.md` を参照: バックエンドの既定は **Edge Functions**、backend-py は LLM / 長時間処理 / 複雑実装の escalation 先）。

## Code Quality

### Ruff

- Line length: 88
- Target: Python 3.12
- Max complexity: 3 (McCabe)
- Docstrings: Google

### MyPy

- Strict mode 有効
- `tests/` は exclude

### pytest

- 起点: `tests/`
- 既定: `--cov=src --cov-report=term-missing --cov-report=html`
- async: pytest-asyncio (`auto` mode)

#### Sample test

```python
def test_health_check(client):
    response = client.get("/healthcheck")
    assert response.status_code == 200
    assert response.json() == {"message": "OK"}
```

## SQLModel Operations (MUST be Synchronous)

SQLModel の async サポートは公式に未提供（[issue #654](https://github.com/fastapi/sqlmodel/issues/654)）。Session 操作は **同期実装**で書き、FastAPI のエンドポイントだけを async にする。

```python
# ✅ Good: 同期 SQLModel
from sqlmodel import Session, select


class UserGateway:
    def get_by_id(self, session: Session, user_id: str) -> User | None:
        return session.exec(select(User).where(User.id == user_id)).first()


# Endpoint は async でも内部は同期 SQLModel で OK
@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    session: Session = Depends(get_session),
) -> UserResponse:
    return UserResponse.from_orm(UserGateway().get_by_id(session, user_id))
```

## Container / Deploy

### Railway (Production)

Railpack（ゼロコンフィグビルダー）を使用。Dockerfile 不要。Railway のサービス設定で Root Directory を `backend-py/app` に指定する。

```toml
# backend-py/app/railway.toml
[build]
builder = "RAILPACK"
```

#### railpack.json によるカスタマイズ

通常はゼロコンフィグで動作するため `railpack.json` は空（スキーマのみ）で問題ない。以下のケースで設定を追加する:

| ケース | 設定例 |
|--------|--------|
| システムパッケージが必要（libpq, ffmpeg 等） | `"buildAptPackages": ["libpq-dev"]`, `"deploy": { "aptPackages": ["libpq5"] }` |
| スタートコマンドのカスタマイズ（ワーカー数等） | `"deploy": { "startCommand": "..." }` |
| ビルドステップの追加（DB migration 等） | `"steps": { "build": { "commands": ["...", "uv run alembic upgrade head"] } }` |
| ビルド時シークレットが必要 | `"secrets": ["DATABASE_URL"]` |
| ファイナルイメージの最小化 | `"steps": { "install": { "deployOutputs": ["/app/**"] } }` |

> 参考: https://railpack.com/config/file/

### devenv dockerTools (Other platforms)

```bash
devenv container build backend
devenv container copy backend
```

## Environment Variables

`env/backend/.env.local` で管理する。

```env
POSTGRES_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
# Optional: enable verbose SQLModel query echo (default off)
# SQL_ECHO=1
```

LLM などの追加サービスを使うときに、対応する API key 等を都度追加する。

## API Documentation

FastAPI が自動生成する:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Troubleshooting

### Database Connection

```bash
echo $POSTGRES_URL

cd backend-py/app
python -c "from src.infra.db_client import engine; print(engine)"
```

### Type Check Failures

```bash
cd backend-py/app
uv run mypy src/ --show-error-codes
```

### Import Errors

```bash
export PYTHONPATH=/service/app/src
# or
cd backend-py/app && python -m pytest
```

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com)
- [Ruff Documentation](https://docs.astral.sh/ruff/)
- [MyPy Documentation](https://mypy.readthedocs.io)
- [pytest Documentation](https://docs.pytest.org)
- [uv Documentation](https://github.com/astral-sh/uv)

For project-specific guidelines, see `/CLAUDE.md` in the project root.
