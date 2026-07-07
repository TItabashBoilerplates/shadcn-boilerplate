"""Uvicorn entrypoint for `uv run --package api api` and the Vercel container.

The Vercel container started from Dockerfile.vercel must listen on `$PORT`
(default 80). See https://vercel.com/docs/functions/container-images. Local
runs via `uv run --package api api` leave `PORT` unset and fall back to 4040.
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
