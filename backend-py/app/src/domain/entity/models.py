from datetime import datetime
from typing import Any, List, Optional

from pgvector.sqlalchemy.vector import VECTOR
from sqlalchemy import ARRAY, BigInteger, CheckConstraint, Column, Enum, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, Text, UUID, UniqueConstraint, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlmodel import Field, Relationship, SQLModel

class DrizzleMigrations(SQLModel, table=True):
    __tablename__ = '__drizzle_migrations'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='__drizzle_migrations_pkey'),
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    hash: str = Field(sa_column=Column('hash', Text))
    created_at: Optional[int] = Field(default=None, sa_column=Column('created_at', BigInteger))


class ChatRooms(SQLModel, table=True):
    __tablename__ = 'chat_rooms'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='chat_rooms_pkey'),
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    type: str = Field(sa_column=Column('type', Enum('PRIVATE', 'GROUP', name='chat_type')))
    created_at: datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), server_default=text('now()')))

    user_chats: List['UserChats'] = Relationship(back_populates='chat_room')
    messages: List['Messages'] = Relationship(back_populates='chat_room')
    virtual_user_chats: List['VirtualUserChats'] = Relationship(back_populates='chat_room')


class Embeddings(SQLModel, table=True):
    __table_args__ = (
        PrimaryKeyConstraint('id', name='embeddings_pkey'),
    )

    id: str = Field(sa_column=Column('id', Text, primary_key=True))
    embedding: Any = Field(sa_column=Column('embedding', VECTOR(1536)))
    content: str = Field(sa_column=Column('content', Text))
    metadata_: dict = Field(sa_column=Column('metadata', JSONB))
    created_at: datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), server_default=text('now()')))
    updated_at: datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), server_default=text('now()')))


class GeneralUsers(SQLModel, table=True):
    __tablename__ = 'general_users'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='general_users_pkey'),
        UniqueConstraint('account_name', name='general_users_account_name_unique')
    )

    id: UUID = Field(sa_column=Column('id', Uuid, primary_key=True))
    display_name: str = Field(sa_column=Column('display_name', Text, server_default=text("''::text")))
    account_name: str = Field(sa_column=Column('account_name', Text))
    created_at: datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), server_default=text('now()')))
    updated_at: datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), server_default=text('now()')))

    general_user_profiles: Optional['GeneralUserProfiles'] = Relationship(sa_relationship_kwargs={'uselist': False}, back_populates='user')
    user_chats: List['UserChats'] = Relationship(back_populates='user')
    virtual_users: List['VirtualUsers'] = Relationship(back_populates='owner')
    messages: List['Messages'] = Relationship(back_populates='sender')


class Organizations(SQLModel, table=True):
    __table_args__ = (
        PrimaryKeyConstraint('id', name='organizations_pkey'),
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    name: str = Field(sa_column=Column('name', Text))
    created_at: datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), server_default=text('now()')))
    updated_at: datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), server_default=text('now()')))

    corporate_users: List['CorporateUsers'] = Relationship(back_populates='organization')


class CorporateUsers(SQLModel, table=True):
    __tablename__ = 'corporate_users'
    __table_args__ = (
        ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name='corporate_users_organization_id_organizations_id_fk'),
        PrimaryKeyConstraint('id', name='corporate_users_pkey')
    )

    id: UUID = Field(sa_column=Column('id', Uuid, primary_key=True))
    name: str = Field(sa_column=Column('name', Text, server_default=text("''::text")))
    organization_id: int = Field(sa_column=Column('organization_id', Integer))
    created_at: datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), server_default=text('now()')))
    updated_at: datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), server_default=text('now()')))

    organization: Optional['Organizations'] = Relationship(back_populates='corporate_users')


class GeneralUserProfiles(SQLModel, table=True):
    __tablename__ = 'general_user_profiles'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['general_users.id'], ondelete='CASCADE', name='general_user_profiles_user_id_general_users_id_fk'),
        PrimaryKeyConstraint('id', name='general_user_profiles_pkey'),
        UniqueConstraint('email', name='general_user_profiles_email_unique'),
        UniqueConstraint('user_id', name='general_user_profiles_user_id_unique')
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    first_name: str = Field(sa_column=Column('first_name', Text, server_default=text("''::text")))
    last_name: str = Field(sa_column=Column('last_name', Text, server_default=text("''::text")))
    user_id: UUID = Field(sa_column=Column('user_id', Uuid))
    email: str = Field(sa_column=Column('email', Text))
    phone_number: Optional[str] = Field(default=None, sa_column=Column('phone_number', Text))

    user: Optional['GeneralUsers'] = Relationship(back_populates='general_user_profiles')
    addresses: Optional['Addresses'] = Relationship(sa_relationship_kwargs={'uselist': False}, back_populates='profile')


class UserChats(SQLModel, table=True):
    __tablename__ = 'user_chats'
    __table_args__ = (
        ForeignKeyConstraint(['chat_room_id'], ['chat_rooms.id'], ondelete='CASCADE', name='user_chats_chat_room_id_chat_rooms_id_fk'),
        ForeignKeyConstraint(['user_id'], ['general_users.id'], ondelete='CASCADE', name='user_chats_user_id_general_users_id_fk'),
        PrimaryKeyConstraint('id', name='user_chats_pkey'),
        Index('user_chats_user_id_chat_room_id_key', 'user_id', 'chat_room_id', unique=True)
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    user_id: UUID = Field(sa_column=Column('user_id', Uuid))
    chat_room_id: int = Field(sa_column=Column('chat_room_id', Integer))

    chat_room: Optional['ChatRooms'] = Relationship(back_populates='user_chats')
    user: Optional['GeneralUsers'] = Relationship(back_populates='user_chats')


class VirtualUsers(SQLModel, table=True):
    __tablename__ = 'virtual_users'
    __table_args__ = (
        ForeignKeyConstraint(['owner_id'], ['general_users.id'], ondelete='CASCADE', name='virtual_users_owner_id_general_users_id_fk'),
        PrimaryKeyConstraint('id', name='virtual_users_pkey')
    )

    id: UUID = Field(sa_column=Column('id', Uuid, primary_key=True))
    name: str = Field(sa_column=Column('name', Text))
    owner_id: UUID = Field(sa_column=Column('owner_id', Uuid))
    created_at: datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), server_default=text('now()')))
    updated_at: datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), server_default=text('now()')))

    owner: Optional['GeneralUsers'] = Relationship(back_populates='virtual_users')
    messages: List['Messages'] = Relationship(back_populates='virtual_user')
    virtual_user_chats: List['VirtualUserChats'] = Relationship(back_populates='virtual_user')
    virtual_user_profiles: List['VirtualUserProfiles'] = Relationship(back_populates='virtual_user')


class Addresses(SQLModel, table=True):
    __table_args__ = (
        ForeignKeyConstraint(['profile_id'], ['general_user_profiles.id'], ondelete='CASCADE', name='addresses_profile_id_general_user_profiles_id_fk'),
        PrimaryKeyConstraint('id', name='addresses_pkey'),
        UniqueConstraint('profile_id', name='addresses_profile_id_unique')
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    street: str = Field(sa_column=Column('street', Text))
    city: str = Field(sa_column=Column('city', Text))
    state: str = Field(sa_column=Column('state', Text))
    postal_code: str = Field(sa_column=Column('postal_code', Text))
    country: str = Field(sa_column=Column('country', Text))
    profile_id: Optional[int] = Field(default=None, sa_column=Column('profile_id', Integer))

    profile: Optional['GeneralUserProfiles'] = Relationship(back_populates='addresses')


class Messages(SQLModel, table=True):
    __table_args__ = (
        CheckConstraint('sender_id IS NOT NULL AND virtual_user_id IS NULL OR sender_id IS NULL AND virtual_user_id IS NOT NULL', name='sender_check'),
        ForeignKeyConstraint(['chat_room_id'], ['chat_rooms.id'], ondelete='CASCADE', name='messages_chat_room_id_chat_rooms_id_fk'),
        ForeignKeyConstraint(['sender_id'], ['general_users.id'], ondelete='CASCADE', name='messages_sender_id_general_users_id_fk'),
        ForeignKeyConstraint(['virtual_user_id'], ['virtual_users.id'], ondelete='CASCADE', name='messages_virtual_user_id_virtual_users_id_fk'),
        PrimaryKeyConstraint('id', name='messages_pkey')
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    chat_room_id: int = Field(sa_column=Column('chat_room_id', Integer))
    content: str = Field(sa_column=Column('content', Text))
    created_at: datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), server_default=text('now()')))
    sender_id: Optional[UUID] = Field(default=None, sa_column=Column('sender_id', Uuid))
    virtual_user_id: Optional[UUID] = Field(default=None, sa_column=Column('virtual_user_id', Uuid))

    chat_room: Optional['ChatRooms'] = Relationship(back_populates='messages')
    sender: Optional['GeneralUsers'] = Relationship(back_populates='messages')
    virtual_user: Optional['VirtualUsers'] = Relationship(back_populates='messages')


class VirtualUserChats(SQLModel, table=True):
    __tablename__ = 'virtual_user_chats'
    __table_args__ = (
        ForeignKeyConstraint(['chat_room_id'], ['chat_rooms.id'], ondelete='CASCADE', name='virtual_user_chats_chat_room_id_chat_rooms_id_fk'),
        ForeignKeyConstraint(['virtual_user_id'], ['virtual_users.id'], ondelete='CASCADE', name='virtual_user_chats_virtual_user_id_virtual_users_id_fk'),
        PrimaryKeyConstraint('id', name='virtual_user_chats_pkey'),
        Index('virtual_user_chats_virtual_user_id_chat_room_id_key', 'virtual_user_id', 'chat_room_id', unique=True)
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    virtual_user_id: UUID = Field(sa_column=Column('virtual_user_id', Uuid))
    chat_room_id: int = Field(sa_column=Column('chat_room_id', Integer))

    chat_room: Optional['ChatRooms'] = Relationship(back_populates='virtual_user_chats')
    virtual_user: Optional['VirtualUsers'] = Relationship(back_populates='virtual_user_chats')


class VirtualUserProfiles(SQLModel, table=True):
    __tablename__ = 'virtual_user_profiles'
    __table_args__ = (
        ForeignKeyConstraint(['virtual_user_id'], ['virtual_users.id'], ondelete='CASCADE', name='virtual_user_profiles_virtual_user_id_virtual_users_id_fk'),
        PrimaryKeyConstraint('id', name='virtual_user_profiles_pkey')
    )

    id: Optional[int] = Field(default=None, sa_column=Column('id', Integer, primary_key=True))
    personality: str = Field(sa_column=Column('personality', Text, server_default=text("'friendly'::text")))
    tone: str = Field(sa_column=Column('tone', Text, server_default=text("'casual'::text")))
    knowledge_area: list = Field(sa_column=Column('knowledge_area', ARRAY(Text())))
    backstory: str = Field(sa_column=Column('backstory', Text, server_default=text("''::text")))
    virtual_user_id: UUID = Field(sa_column=Column('virtual_user_id', Uuid))
    created_at: datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), server_default=text('now()')))
    updated_at: datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), server_default=text('now()')))
    quirks: Optional[str] = Field(default=None, sa_column=Column('quirks', Text, server_default=text("''::text")))
    knowledge: Optional[dict] = Field(default=None, sa_column=Column('knowledge', JSONB))

    virtual_user: Optional['VirtualUsers'] = Relationship(back_populates='virtual_user_profiles')
