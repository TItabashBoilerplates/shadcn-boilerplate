"""Domain entity package.

Import order matters: base entities first, then those with FK dependencies.
SQLAlchemy resolves relationships lazily from its registry, so all models
must be imported before any ORM queries are executed.
"""

from domain.entity.order import Orders
from domain.entity.subscription import Subscriptions
from domain.entity.user import Users
from domain.entity.user_profile import UserProfiles

__all__ = [
    "Orders",
    "Subscriptions",
    "UserProfiles",
    "Users",
]
