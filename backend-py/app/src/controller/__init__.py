from fastapi import APIRouter

from controller.base_controller import router as base_router
from controller.llm_controller import router as llm_router
from controller.virtual_user_chat_controller import router as virtual_chat_router

router = APIRouter()

router.include_router(base_router, tags=["base"])
router.include_router(llm_router, prefix="/llm", tags=["llm"])
router.include_router(
    virtual_chat_router,
    prefix="/virtual_chat",
    tags=["virtual_chat"],
)
