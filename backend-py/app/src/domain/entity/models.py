"""このファイルはsqlacodegenによって自動生成されることを想定しています.

手動で編集する場合は、docker-compose.backend.yamlのコマンドでファイルが上書きされることに注意してください。
以下は、Prismaスキーマから予想されるSQLModelの構造です。
"""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from collections.abc import Sequence


class ChatType(str, Enum):
    """チャットタイプのEnum."""

    PRIVATE = "PRIVATE"
    GROUP = "GROUP"


class ChatRoom(SQLModel, table=True):
    """チャットルームモデル."""

    __tablename__ = "chat_rooms"

    id: int | None = Field(default=None, primary_key=True)
    type: ChatType = Field(sa_column_kwargs={"nullable": False})
    created_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    messages: "Sequence[Message]" = Relationship(back_populates="chat")
    user_chats: "Sequence[UserChat]" = Relationship(back_populates="chat_room")
    virtual_chats: "Sequence[VirtualUserChat]" = Relationship(back_populates="chat_room")


class Message(SQLModel, table=True):
    """メッセージモデル."""

    __tablename__ = "messages"

    id: int | None = Field(default=None, primary_key=True)
    chat_room_id: int = Field(foreign_key="chat_rooms.id")
    sender_id: str | None = Field(default=None, foreign_key="general_users.id")
    virtual_user_id: str | None = Field(default=None, foreign_key="virtual_users.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    chat: ChatRoom = Relationship(back_populates="messages")
    sender: "GeneralUser | None" = Relationship(back_populates="messages")
    virtual_sender: "VirtualUser | None" = Relationship(back_populates="messages")


class VirtualUser(SQLModel, table=True):
    """仮想ユーザモデル."""

    __tablename__ = "virtual_users"

    id: str = Field(primary_key=True)
    name: str
    owner_id: str = Field(foreign_key="general_users.id")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    owner: "GeneralUser" = Relationship(back_populates="virtual_users")
    virtual_chats: "Sequence[VirtualUserChat]" = Relationship(
        back_populates="virtual_user",
    )
    messages: "Sequence[Message]" = Relationship(back_populates="virtual_sender")


class GeneralUser(SQLModel, table=True):
    """一般ユーザモデル."""

    __tablename__ = "general_users"

    id: str = Field(primary_key=True)
    display_name: str = Field(default="")
    account_name: str = Field(unique=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    messages: "Sequence[Message]" = Relationship(back_populates="sender")
    user_chats: "Sequence[UserChat]" = Relationship(back_populates="user")
    virtual_users: "Sequence[VirtualUser]" = Relationship(back_populates="owner")


class UserChat(SQLModel, table=True):
    """ユーザとチャットルームの関係モデル."""

    __tablename__ = "user_chats"

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="general_users.id")
    chat_room_id: int = Field(foreign_key="chat_rooms.id")

    # Relationships
    user: GeneralUser = Relationship(back_populates="user_chats")
    chat_room: ChatRoom = Relationship(back_populates="user_chats")


class VirtualUserChat(SQLModel, table=True):
    """仮想ユーザとチャットルームの関係モデル."""

    __tablename__ = "virtual_user_chats"

    id: int | None = Field(default=None, primary_key=True)
    virtual_user_id: str = Field(foreign_key="virtual_users.id")
    chat_room_id: int = Field(foreign_key="chat_rooms.id")

    # Relationships
    virtual_user: VirtualUser = Relationship(back_populates="virtual_chats")
    chat_room: ChatRoom = Relationship(back_populates="virtual_chats")
