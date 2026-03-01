"""Domain entity package.

Import order matters: base entities first, then those with FK dependencies.
SQLAlchemy resolves relationships lazily from its registry, so all models
must be imported before any ORM queries are executed.
"""

from domain.entity.address import Addresses
from domain.entity.chat_room import ChatRooms
from domain.entity.corporate_user import CorporateUsers
from domain.entity.embedding import Embeddings
from domain.entity.message import Messages
from domain.entity.order import Orders
from domain.entity.organization import Organizations
from domain.entity.subscription import Subscriptions
from domain.entity.user import Users
from domain.entity.user_chat import UserChats
from domain.entity.user_profile import UserProfiles
from domain.entity.virtual_user import VirtualUsers
from domain.entity.virtual_user_chat import VirtualUserChats
from domain.entity.virtual_user_profile import VirtualUserProfiles

__all__ = [
    "Addresses",
    "ChatRooms",
    "CorporateUsers",
    "Embeddings",
    "Messages",
    "Orders",
    "Organizations",
    "Subscriptions",
    "UserChats",
    "UserProfiles",
    "Users",
    "VirtualUserChats",
    "VirtualUserProfiles",
    "VirtualUsers",
]
