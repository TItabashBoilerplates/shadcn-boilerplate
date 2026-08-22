"""Static checks for the Vercel Services container configuration.

これらの不変条件は壊れてもローカルでは何も起きない。
`uv sync` も `pytest` も `ci-check` も devenv の backend 起動も通り、
気づけるのは Vercel のビルドログを読んだときだけなので静的に止める。

守っている事実と出典:
docs/_research/2026-08-22-vercel-services-container-build-context.md

1. Vercel が受け付ける Dockerfile 名は Dockerfile.vercel / Containerfile.vercel だけ。
   Dockerfile.api.vercel のような派生名は entrypoint に書いても拒否される。
2. Docker のビルドコンテキストは services.<name>.root ではなく
   Dockerfile が置かれているディレクトリ。uv workspace は uv.lock と
   全 member の pyproject が同一コンテキストに無いと解決できないため、
   Dockerfile は workspace ルートに置くしかない。
3. よって Dockerfile 内の COPY / bind mount は、そのディレクトリ配下に収まる必要がある。
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

# 公式が挙げる許容名は 2 つだけ。
# https://vercel.com/docs/functions/container-images
ALLOWED_DOCKERFILE_NAMES = frozenset({"Dockerfile.vercel", "Containerfile.vercel"})

# --mount=type=bind,source=uv.lock,target=uv.lock の source を拾う
BIND_MOUNT_SOURCE = re.compile(r"--mount=type=bind,[^\s]*\bsource=([^,\s]+)")
# COPY . /app の src を拾う。COPY --from=... は別ステージなので除外する
COPY_LINE = re.compile(r"^\s*COPY\s+(?!--from=)(?P<args>.+)$", re.MULTILINE)


def _container_services() -> list[tuple[str, dict[str, Any]]]:
    config = json.loads(VERCEL_JSON.read_text(encoding="utf-8"))
    services: dict[str, dict[str, Any]] = config.get("services", {})
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


def test_services_declare_container_runtime() -> None:
    """Every service must pin runtime=container."""
    # 無いと Vercel が runtime を自動検出し、entrypoint を module:app と誤解する
    for name, service in _container_services():
        assert service.get("runtime") == "container", (
            f'services.{name} に "runtime": "container" が無い'
        )


@pytest.mark.parametrize(("name", "dockerfile"), _dockerfile_paths())
def test_entrypoint_filename_is_accepted(name: str, dockerfile: Path) -> None:
    """Vercel only accepts Dockerfile.vercel or Containerfile.vercel."""
    assert dockerfile.name in ALLOWED_DOCKERFILE_NAMES, (
        f"services.{name}.entrypoint のファイル名 {dockerfile.name!r} は"
        f" Vercel が受け付けない。使えるのは {sorted(ALLOWED_DOCKERFILE_NAMES)} のみ"
    )


@pytest.mark.parametrize(("name", "dockerfile"), _dockerfile_paths())
def test_entrypoint_exists(name: str, dockerfile: Path) -> None:
    """The referenced Dockerfile must exist."""
    assert dockerfile.is_file(), f"services.{name}.entrypoint の {dockerfile} が無い"


@pytest.mark.parametrize(("name", "dockerfile"), _dockerfile_paths())
def test_build_context_is_workspace_root(name: str, dockerfile: Path) -> None:
    """The build context is the Dockerfile directory, so it is the workspace root."""
    # ここが workspace ルートでないと uv sync --frozen が uv.lock を見つけられない
    context = dockerfile.parent
    assert context == WORKSPACE_ROOT, (
        f"services.{name} の Dockerfile は {context} にあるが、"
        f" uv workspace ルート {WORKSPACE_ROOT} に置く必要がある"
    )
    for required in ("uv.lock", "pyproject.toml"):
        assert (context / required).is_file(), (
            f"ビルドコンテキスト {context} に {required} が無い"
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
