---
paths: backend-py/**/*.py
---

# Python Backend Code Standards

## Architecture

- **Pattern**: Clean Architecture
- **Framework**: FastAPI
- **Package Manager**: uv

## Directory Structure

```
backend-py/app/src/
├── controller/       # HTTP request/response only
├── usecase/          # Business logic
├── gateway/          # Data access interfaces
├── domain/           # Entities, models (sqlacodegen generated)
├── infra/            # External dependencies (DB, API, Supabase)
└── middleware/       # Auth, CORS, logging
```

## Responsibility Separation

- **Controllers**: HTTP layer only, no business logic
- **Use Cases**: Business logic, orchestration
- **Gateways**: Data access abstraction (interface definitions)
- **Infrastructure**: Gateway implementations, external system integration
- **Domain**: Entities, Value Objects

## Code Style

- **Linting**: Ruff
- **Line Length**: 88 characters
- **Type Checking**: MyPy (strict mode)
- **Docstrings**: Google style
- **Max Function Complexity**: 3 (McCabe)

## Type Annotations

All functions MUST have type annotations:

```python
# ✅ Good
async def get_user(user_id: str) -> User:
    ...

# ❌ Bad
async def get_user(user_id):
    ...
```

## Async/Await

All I/O operations MUST use async/await:

```python
# ✅ Good
async def fetch_data() -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

# ❌ Bad
def fetch_data() -> dict:
    response = requests.get(url)
    return response.json()
```

## SQLModel Operations (Exception)

**IMPORTANT**: SQLModel database operations MUST use **synchronous** implementation.

SQLModel's async support is **not yet officially available**. According to the [official roadmap](https://github.com/fastapi/sqlmodel/issues/654), "Async tools and docs" remains an uncompleted task. Until official async support is released, use synchronous Session and operations:

```python
# ✅ Good: Sync SQLModel operations
from sqlmodel import Session, select

def get_user(session: Session, user_id: str) -> User | None:
    statement = select(User).where(User.id == user_id)
    return session.exec(statement).first()

def create_user(session: Session, user: User) -> User:
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# ❌ Bad: Async SQLModel (causes issues)
async def get_user(session: AsyncSession, user_id: str) -> User | None:
    statement = select(User).where(User.id == user_id)
    result = await session.exec(statement)
    return result.first()
```

### Gateway Pattern with Sync SQLModel

```python
class UserGateway:
    def get_by_id(self, session: Session, user_id: str) -> User | None:
        """Sync database operation"""
        statement = select(User).where(User.id == user_id)
        return session.exec(statement).first()

    def create(self, session: Session, user: User) -> User:
        """Sync database operation"""
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
```

### Async Endpoints with Sync SQLModel

FastAPI endpoints can still be async while using sync SQLModel:

```python
@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    session: Session = Depends(get_session),
) -> UserResponse:
    # Sync SQLModel operation inside async endpoint is OK
    gateway = UserGateway()
    user = gateway.get_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=404)
    return UserResponse.from_orm(user)
```
