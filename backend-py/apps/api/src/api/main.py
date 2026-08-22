"""Uvicorn entrypoint for `uv run --package api api` and the Vercel container.

The Vercel container started from Dockerfile.vercel must listen on `$PORT`.
Vercel's default is 80 (https://vercel.com/docs/functions/container-images),
but the image runs as a non-root user, which cannot bind a privileged port, so
the Dockerfile pins `PORT=8080` and the Vercel project sets the same value.
Local runs via `uv run --package api api` leave `PORT` unset and fall back to
4040.

`$PORT` を無視して固定ポートを書き込まないこと。Vercel はプロジェクト設定の
`PORT` へトラフィックを流すため、ここがズレるとコンテナは起動しているのに
502 / 500 になる。背景は Dockerfile.vercel の冒頭コメントと
`.claude/skills/vercel-deploy/references/containers.md`。
"""

from __future__ import annotations

import os

import uvicorn


def main() -> None:
    """Launch the API server on 0.0.0.0:$PORT (fallback 4040 for local runs)."""
    uvicorn.run(
        "api.app:app",
        host="0.0.0.0",  # noqa: S104  # コンテナ・ローカル双方で公開する想定
        port=int(os.environ.get("PORT", "4040")),
        proxy_headers=True,
    )


if __name__ == "__main__":
    main()
