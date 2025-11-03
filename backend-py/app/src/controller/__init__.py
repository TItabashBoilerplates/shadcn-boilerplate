from fastapi import APIRouter

from controller.base_controller import router as base_router

router = APIRouter()

router.include_router(base_router, tags=["base"])
