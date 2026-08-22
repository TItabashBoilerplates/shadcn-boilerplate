"""Static guards for the Vercel container contract.

**壊れても CI が緑のまま、本番だけが落ちる設定を守るテスト。**

`apps/*/Dockerfile.vercel` は次のどちらを踏んでも、ビルドは成功し、型もリントも
テストも通り、`docker build` / `docker run` もローカルでは正常に動く。
**Vercel 上でだけ 500 (INTERNAL_FUNCTION_INVOCATION_FAILED) になり、しかも
アプリのログは 1 行も出ない。**

1. 非 root ユーザーで特権ポート (< 1024) を listen しようとしている

       ERROR: [Errno 13] error while attempting to bind on address
       ('0.0.0.0', 80): permission denied

   Vercel コンテナの既定ポートは 80 だが (公式: "The default port is 80, and it
   can be overridden by setting the PORT environment variable in the project
   settings." https://vercel.com/docs/functions/container-images ),
   `USER appuser` で動くコンテナは CAP_NET_BIND_SERVICE が無いと 1024 未満を
   bind できない。**ローカルの Docker は既定で特権ポートを許可するので、
   手元では絶対に再現しない。**

2. CMD が $PATH 解決に依存している

       exec: "api": executable file not found in $PATH

   Vercel はコンテナ起動時に自前の wrapper を挟むため、イメージの `ENV PATH`
   (ここでは `/app/.venv/bin` を足したもの) が起動プロセスに反映されないこと
   がある。**この挙動は公式には文書化されていない** (実測で確認) ので、
   `CMD` は常に絶対パスで書く。exec に失敗したプロセスはログを 1 行も出さずに
   死ぬため、ランタイムログからは原因が分からない。

Vercel 相当の条件はローカルで作れる。Dockerfile を変えたら必ずこれで確かめる:

    docker build -f apps/api/Dockerfile.vercel -t api-vercel .
    docker run --rm -p 8080:8080 \
      -e PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin \
      --sysctl net.ipv4.ip_unprivileged_port_start=1024 \
      api-vercel
    curl -fsS localhost:8080/healthcheck

詳細と復旧手順: `.claude/skills/vercel-deploy/references/containers.md`
"""

from __future__ import annotations

import json
import re
import shlex
from pathlib import Path

import pytest

# backend-py/apps/api/tests/ から 3 つ上が uv workspace ルート
# ( = Vercel backend project の Root Directory )
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]

# 1024 未満は特権ポート。非 root では CAP_NET_BIND_SERVICE 無しに bind できない。
FIRST_UNPRIVILEGED_PORT = 1024

# root として扱う USER の値。これ以外は非 root とみなす。
ROOT_USERS = frozenset({"root", "0", "root:root", "0:0"})


def _logical_lines(dockerfile: Path) -> list[str]:
    """Return Dockerfile lines with continuations joined and comments dropped."""
    joined = re.sub(r"\\\s*\n\s*", " ", dockerfile.read_text(encoding="utf-8"))
    stripped = (line.strip() for line in joined.splitlines())
    return [line for line in stripped if line and not line.startswith("#")]


def _instructions(dockerfile: Path) -> list[tuple[str, str]]:
    """Return (instruction, args) pairs for the whole Dockerfile."""
    parts = [line.split(maxsplit=1) for line in _logical_lines(dockerfile)]
    return [(head.upper(), rest[0] if rest else "") for head, *rest in parts]


def _final_stage(dockerfile: Path) -> list[tuple[str, str]]:
    """Return the instructions of the last build stage, which is the one that runs."""
    instructions = _instructions(dockerfile)
    stages = [i for i, (op, _) in enumerate(instructions) if op == "FROM"]
    return instructions[(stages[-1] if stages else -1) + 1 :]


def _env(stage: list[tuple[str, str]]) -> dict[str, str]:
    """Return the ENV declarations of a stage, last one winning."""
    tokens = [t for op, args in stage if op == "ENV" for t in shlex.split(args)]
    return dict(token.split("=", 1) for token in tokens if "=" in token)  # type: ignore[misc]


def _last(stage: list[tuple[str, str]], op: str) -> str | None:
    """Return the args of the last `op` instruction, or None when absent."""
    values = [args for name, args in stage if name == op]
    return values[-1] if values else None


def _exec_form(args: str) -> list[str] | None:
    """Return argv when the instruction uses exec form, None for shell form."""
    if not args.startswith("["):
        return None
    return [str(item) for item in json.loads(args)]


def _vercel_dockerfiles() -> list[Path]:
    """Return every container entrypoint Vercel may build."""
    return sorted(WORKSPACE_ROOT.glob("apps/*/Dockerfile.vercel"))


def test_vercel_dockerfiles_exist():
    """検査対象が 0 件なら glob が壊れている, つまりこのテストは無言で空回りしている."""
    assert _vercel_dockerfiles(), f"apps/*/Dockerfile.vercel が無い: {WORKSPACE_ROOT}"


@pytest.mark.parametrize(
    "dockerfile", _vercel_dockerfiles(), ids=lambda p: p.parent.name
)
def test_non_root_container_listens_on_an_unprivileged_port(dockerfile):
    """非 root で動くなら PORT は 1024 以上. 80 のままだと bind が EACCES で落ちる."""
    stage = _final_stage(dockerfile)
    user = _last(stage, "USER")
    if user is None or user in ROOT_USERS:
        pytest.skip("root 実行のコンテナなので特権ポートを bind できる")

    port = _env(stage).get("PORT")
    assert port is not None, (
        f"{dockerfile}: 非 root コンテナは ENV PORT を明示すること。"
        "Vercel の既定 80 は非 root では bind できない"
    )
    assert int(port) >= FIRST_UNPRIVILEGED_PORT, (
        f"{dockerfile}: USER={user} では PORT={port} を bind できない "
        f"(permission denied)。{FIRST_UNPRIVILEGED_PORT} 以上にし、"
        "Vercel project の環境変数 PORT も同じ値に揃えること"
    )


@pytest.mark.parametrize(
    "dockerfile", _vercel_dockerfiles(), ids=lambda p: p.parent.name
)
def test_expose_matches_the_declared_port(dockerfile):
    """EXPOSE と ENV PORT がズレていると, 読む人がポートを取り違える."""
    stage = _final_stage(dockerfile)
    port = _env(stage).get("PORT")
    expose = _last(stage, "EXPOSE")
    if port is None or expose is None:
        pytest.skip("PORT / EXPOSE のいずれかが未宣言")
    assert expose.split("/")[0] == port, (
        f"{dockerfile}: EXPOSE {expose} と ENV PORT={port} が一致していない"
    )


@pytest.mark.parametrize(
    "dockerfile", _vercel_dockerfiles(), ids=lambda p: p.parent.name
)
def test_entrypoint_uses_an_absolute_path(dockerfile):
    """CMD / ENTRYPOINT は $PATH に頼らない. 起動 wrapper で PATH が失われるため."""
    stage = _final_stage(dockerfile)
    instruction = "ENTRYPOINT" if _last(stage, "ENTRYPOINT") else "CMD"
    args = _last(stage, instruction)
    assert args is not None, f"{dockerfile}: CMD も ENTRYPOINT も無い"

    argv = _exec_form(args)
    assert argv, (
        f"{dockerfile}: {instruction} は exec 形式 (JSON 配列) で書くこと。"
        "shell 形式は sh 経由になり SIGTERM が uvicorn に届かない"
    )
    assert argv[0].startswith("/"), (
        f"{dockerfile}: {instruction} の {argv[0]} が $PATH 解決に依存している。"
        f'Vercel 上では `exec: "{argv[0]}": executable file not found in $PATH` '
        "で無言に死ぬ。絶対パス (例: /app/.venv/bin/api) で書くこと"
    )


def test_vercel_json_entrypoints_point_at_real_dockerfiles():
    """vercel.json の service が実在しない Dockerfile を指していないこと."""
    config = json.loads((WORKSPACE_ROOT / "vercel.json").read_text(encoding="utf-8"))
    services = config.get("services", {})
    assert services, "vercel.json に services が無い"

    for name, service in services.items():
        entrypoint = WORKSPACE_ROOT / service.get("root", ".") / service["entrypoint"]
        assert entrypoint.is_file(), (
            f"vercel.json の service '{name}' が指す {entrypoint} が存在しない"
        )
