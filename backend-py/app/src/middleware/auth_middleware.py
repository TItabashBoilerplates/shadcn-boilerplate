from logging import getLogger
from typing import NoReturn

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from supabase_auth.types import User

from infra.supabase_client import SupabaseClient

authorization_header = APIKeyHeader(name="Authorization", auto_error=True)

logger = getLogger("uvicorn")


def _raise_unauthorized(detail: str) -> NoReturn:
    """Raise unauthorized HTTP exception."""
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
    )


async def verify_token(auth_header: str = Depends(authorization_header)) -> User:
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="無効な認証トークンフォーマットです",
        )

    token = auth_header.split(" ")[1]

    try:
        supabase_client = SupabaseClient(access_token=token)
        user: User | None = supabase_client.get_user()
        logger.info("user: %s", user)
        if user is not None:
            return user
        _raise_unauthorized("Unauthorized")
    except Exception as e:
        logger.exception("Authentication error")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        ) from e
