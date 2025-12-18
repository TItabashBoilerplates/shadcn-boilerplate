# Backend Python Guidelines

## Architecture

- Clean Architecture layers
- SQLModel for sync implementation

## Patterns

- Gateway pattern for DRY
- Type hints required

## Formatting

- Black for code formatting
- Ruff for linting

## Commands

```bash
make lint-backend-py
make format-backend-py
make test-backend-py
```

## Auto-Generated

`src/domain/entity/models.py` is auto-generated on container startup.
DO NOT edit manually.
