from typing import Any

from pydantic import BaseModel, Field


class SupabaseWebhookPayload(BaseModel):
    type: str
    table: str
    db_schema: str = Field(alias="schema")
    record: dict[str, Any]
    old_record: dict[str, Any] | None
