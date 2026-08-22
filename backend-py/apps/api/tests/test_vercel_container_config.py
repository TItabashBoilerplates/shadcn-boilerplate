"""Static checks for the Vercel Services container configuration.

これらの不変条件は壊れてもローカルでは何も起きない。
`uv sync` も `pytest` も `ci-check` も devenv の backend 起動も通り、
気づけるのは Vercel のビルドログを読んだときだけなので静的に止める。

Vercel の実装で確定している制約 (vercel/vercel):

  packages/fs-detectors/src/services/resolve-v2.ts
    CONTAINER_ENTRYPOINT_CANDIDATES =
      Dockerfile.vercel / Containerfile.vercel / Dockerfile / Containerfile
    接尾辞つきの名前 (Dockerfile.api.vercel) は never matched。

  packages/container/src/index.ts
    contextDir = path.dirname(dockerfilePath)
    ビルドコンテキストは常に Dockerfile のあるディレクトリ。上書き手段は無い。

uv 公式は workspace のビルドに全 member の pyproject.toml を要求するため、
コンテキストは uv workspace ルートでなければならない。
両者を満たす置き方は「blessed 名で workspace ルートに置く」の 1 つだけ。

出典と実測: docs/_research/2026-08-22-vercel-services-container-build-context.md
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pytest

# backend-py/apps/api/tests/ から workspace ルート backend-py/ へ
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
VERCEL_JSON = WORKSPACE_ROOT / "vercel.json"

# resolve-v2.ts の CONTAINER_ENTRYPOINT_CANDIDATES と同順。
# 公式ドキュメントに載っているのは先頭 2 つだけなので、そちらを優先して使う。
ALLOWED_DOCKERFILE_NAMES = (
    "Dockerfile.vercel",
    "Containerfile.vercel",
    "Dockerfile",
    "Containerfile",
)
# 1 ディレクトリに置ける blessed 名の数 = そのディレクトリのコンテナサービス上限
MAX_SERVICES_PER_DIR = len(ALLOWED_DOCKERFILE_NAMES)

# --mount=type=bind,source=uv.lock,target=uv.lock の source を拾う
BIND_MOUNT_SOURCE = re.compile(r"--mount=type=bind,[^\s]*\bsource=([^,\s]+)")
# COPY . /app の src を拾う。COPY --from=... は別ステージなので除外する
COPY_LINE = re.compile(r"^\s*COPY\s+(?!--from=)(?P<args>.+)$", re.MULTILINE)


def _config() -> dict[str, Any]:
    return json.loads(VERCEL_JSON.read_text(encoding="utf-8"))


def _container_services() -> list[tuple[str, dict[str, Any]]]:
    services: dict[str, dict[str, Any]] = _config().get("services", {})
    assert services, "backend-py/vercel.json に services が無い"
    return [
        (name, service)
        for name, service in services.items()
        if service.get("runtime") == "container" or "entrypoint" in service
    ]


def _dockerfile_paths() -> list[tuple[str, Path]]:
    # entrypoint は service の root からの相対パス
    base = VERCEL_JSON.parent
    return [
        (name, (base / str(svc.get("root", ".")) / str(svc["entrypoint"])).resolve())
        for name, svc in _container_services()
    ]


def _referenced_sources(text: str) -> set[str]:
    sources = set(BIND_MOUNT_SOURCE.findall(text))
    for match in COPY_LINE.finditer(text):
        args = match.group("args").split()
        # 最後の引数は宛先。--chown= などのフラグは除く
        sources.update(arg for arg in args[:-1] if not arg.startswith("--"))
    return sources


def _exposed_services() -> set[str]:
    exposed = set()
    for rule in _config().get("rewrites", []):
        destination = rule.get("destination")
        if isinstance(destination, dict) and "service" in destination:
            exposed.add(str(destination["service"]))
    return exposed


def test_services_declare_container_runtime() -> None:
    """Every service must pin runtime=container."""
    # 無いと Vercel が runtime を自動検出し、entrypoint を module:app と誤解する
    for name, service in _container_services():
        assert service.get("runtime") == "container", (
            f'services.{name} に "runtime": "container" が無い'
        )


@pytest.mark.parametrize(("name", "dockerfile"), _dockerfile_paths())
def test_entrypoint_filename_is_accepted(name: str, dockerfile: Path) -> None:
    """Vercel only matches the four blessed container entrypoint basenames."""
    assert dockerfile.name in ALLOWED_DOCKERFILE_NAMES, (
        f"services.{name}.entrypoint のファイル名 {dockerfile.name!r} は"
        f" Vercel が受け付けない。使えるのは {list(ALLOWED_DOCKERFILE_NAMES)} のみ"
    )


@pytest.mark.parametrize(("name", "dockerfile"), _dockerfile_paths())
def test_entrypoint_exists(name: str, dockerfile: Path) -> None:
    """The referenced Dockerfile must exist."""
    assert dockerfile.is_file(), f"services.{name}.entrypoint の {dockerfile} が無い"


@pytest.mark.parametrize(("name", "dockerfile"), _dockerfile_paths())
def test_build_context_is_workspace_root(name: str, dockerfile: Path) -> None:
    """The build context is the Dockerfile directory, so it is the workspace root."""
    # ここが workspace ルートでないと uv sync が uv.lock と全 member を見つけられない
    context = dockerfile.parent
    assert context == WORKSPACE_ROOT, (
        f"services.{name} の Dockerfile は {context} にあるが、"
        f" uv workspace ルート {WORKSPACE_ROOT} に置く必要がある"
    )
    for required in ("uv.lock", "pyproject.toml"):
        assert (context / required).is_file(), (
            f"ビルドコンテキスト {context} に {required} が無い"
        )


def test_each_service_uses_a_distinct_entrypoint() -> None:
    """Two services in one directory cannot share a Dockerfile name."""
    paths = [str(dockerfile) for _, dockerfile in _dockerfile_paths()]
    assert len(paths) == len(set(paths)), (
        f"同じ Dockerfile を複数の service が指している: {sorted(paths)}"
    )


def test_container_services_fit_the_blessed_name_budget() -> None:
    """A directory can host at most as many services as there are blessed names."""
    # blessed 名は 4 つしか無いので、5 つ目は別ディレクトリか別 project になる
    per_dir: dict[Path, int] = {}
    for _, dockerfile in _dockerfile_paths():
        per_dir[dockerfile.parent] = per_dir.get(dockerfile.parent, 0) + 1
    for directory, count in per_dir.items():
        assert count <= MAX_SERVICES_PER_DIR, (
            f"{directory} のコンテナサービスが {count} 個ある。"
            f" 使える blessed 名は {MAX_SERVICES_PER_DIR} 個まで"
        )


def test_every_container_service_is_exposed_by_a_rewrite() -> None:
    """Services are private by default: only a top-level rewrite exposes them."""
    # rewrite が無い service は公開されず、デプロイは成功するのに 404 になる
    exposed = _exposed_services()
    for name, _ in _container_services():
        assert name in exposed, (
            f"services.{name} を指す top-level rewrite が無い。"
            " service は既定で非公開なので外部から到達できない"
        )


@pytest.mark.parametrize(("name", "dockerfile"), _dockerfile_paths())
def test_referenced_paths_stay_in_context(name: str, dockerfile: Path) -> None:
    """COPY and bind-mount sources must resolve inside the build context."""
    # コンテキスト外を指すと failed to compute cache key でビルドが落ちる
    context = dockerfile.parent
    for source in sorted(_referenced_sources(dockerfile.read_text(encoding="utf-8"))):
        assert not Path(source).is_absolute(), (
            f"{name}: COPY/bind の source {source!r} が絶対パス"
        )
        target = (context / source).resolve()
        assert target.is_relative_to(context), (
            f"{name}: {source!r} はビルドコンテキスト {context} の外を指している"
        )
        assert target.exists(), f"{name}: {source!r} がコンテキスト内に無い"


@pytest.mark.parametrize(("name", "dockerfile"), _dockerfile_paths())
def test_dockerignore_is_in_context(name: str, dockerfile: Path) -> None:
    """Docker only reads <context>/.dockerignore."""
    # コンテキストとずれていると .dockerignore は無言で効かなくなる
    assert (dockerfile.parent / ".dockerignore").is_file(), (
        f"services.{name} のコンテキスト {dockerfile.parent} に .dockerignore が無い"
    )
