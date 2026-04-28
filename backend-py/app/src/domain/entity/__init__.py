"""Domain entity package.

Currently empty — the boilerplate ships only with FastAPI scaffolding and
Supabase auth/logging middleware. Add SQLModel entities here as you grow the
domain. Import order matters once entities have FK dependencies, since
SQLAlchemy resolves relationships lazily from its registry: import base
entities first, then those with dependencies.
"""

__all__: list[str] = []
