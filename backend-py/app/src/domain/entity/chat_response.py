import strawberry
from pydantic import BaseModel, Field
from enum import Enum


@strawberry.enum
class Category(Enum):
    MEAL = 1
    FASHION = 2
    HOME = 3


@strawberry.type
class ChatResponse(BaseModel):
    response: str = Field(..., description="問いに対する簡潔な回答")
    reason: str = Field(..., description="responseの理由")
    category: Category = Field(..., description="問いが当てはまるカテゴリー")
