from fastapi import APIRouter, Depends
from gotrue.types import User

from middleware.auth_middleware import verify_token

router = APIRouter()


@router.get("/")
async def root(
    current_user: User = Depends(verify_token),
) -> dict[str, str]:
    return {"message": f"Hello {current_user.email}"}


@router.get("/healthcheck")
async def healthcheck() -> dict[str, str]:
    return {"message": "OK"}
