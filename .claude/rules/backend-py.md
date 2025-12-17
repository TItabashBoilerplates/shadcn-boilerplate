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
