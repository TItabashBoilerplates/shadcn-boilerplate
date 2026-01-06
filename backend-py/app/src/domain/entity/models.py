from typing import Any, Optional
import datetime
import uuid

from pgvector.sqlalchemy.vector import VECTOR
from sqlalchemy import ARRAY, BigInteger, CheckConstraint, Column, Enum, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, Text, UniqueConstraint, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlmodel import Field, Relationship, SQLModel

class DrizzleMigrations(SQLModel, table=True):
    __tablename__ = '__drizzle_migrations'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='__drizzle_migrations_pkey'),
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    hash: str = Field(sa_column=Column('hash', Text, nullable=False))
    created_at: Optional[int] = Field(default=None, sa_column=Column('created_at', BigInteger))


class ChatRooms(SQLModel, table=True):
    __tablename__ = 'chat_rooms'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='chat_rooms_pkey'),
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    type: str = Field(sa_column=Column('type', Enum('PRIVATE', 'GROUP', name='chat_type'), nullable=False))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))

    user_chats: list['UserChats'] = Relationship(back_populates='chat_room')
    messages: list['Messages'] = Relationship(back_populates='chat_room')
    virtual_user_chats: list['VirtualUserChats'] = Relationship(back_populates='chat_room')


class Embeddings(SQLModel, table=True):
    __table_args__ = (
        PrimaryKeyConstraint('id', name='embeddings_pkey'),
    )

    id: str = Field(sa_column=Column('id', Text, primary_key=True))
    embedding: Any = Field(sa_column=Column('embedding', VECTOR(1536), nullable=False))
    content: str = Field(sa_column=Column('content', Text, nullable=False))
    metadata_: dict = Field(sa_column=Column('metadata', JSONB, nullable=False))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    updated_at: datetime.datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))


class Organizations(SQLModel, table=True):
    __table_args__ = (
        PrimaryKeyConstraint('id', name='organizations_pkey'),
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    name: str = Field(sa_column=Column('name', Text, nullable=False))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    updated_at: datetime.datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))

    corporate_users: list['CorporateUsers'] = Relationship(back_populates='organization')


class Users(SQLModel, table=True):
    __table_args__ = (
        PrimaryKeyConstraint('id', name='users_pkey'),
        UniqueConstraint('account_name', name='users_account_name_unique')
    )

    id: uuid.UUID = Field(sa_column=Column('id', Uuid, primary_key=True))
    display_name: str = Field(sa_column=Column('display_name', Text, nullable=False, server_default=text("''::text")))
    account_name: str = Field(sa_column=Column('account_name', Text, nullable=False))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    updated_at: datetime.datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))

    orders: list['Orders'] = Relationship(back_populates='user')
    subscriptions: list['Subscriptions'] = Relationship(back_populates='user')
    user_chats: list['UserChats'] = Relationship(back_populates='user')
    user_profiles: Optional['UserProfiles'] = Relationship(sa_relationship_kwargs={'uselist': False}, back_populates='user')
    virtual_users: list['VirtualUsers'] = Relationship(back_populates='owner')
    messages: list['Messages'] = Relationship(back_populates='sender')


class CorporateUsers(SQLModel, table=True):
    __tablename__ = 'corporate_users'
    __table_args__ = (
        ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name='corporate_users_organization_id_organizations_id_fk'),
        PrimaryKeyConstraint('id', name='corporate_users_pkey')
    )

    id: uuid.UUID = Field(sa_column=Column('id', Uuid, primary_key=True))
    name: str = Field(sa_column=Column('name', Text, nullable=False, server_default=text("''::text")))
    organization_id: int = Field(sa_column=Column('organization_id', Integer, nullable=False))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    updated_at: datetime.datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))

    organization: Optional['Organizations'] = Relationship(back_populates='corporate_users')


class Orders(SQLModel, table=True):
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='orders_user_id_users_id_fk'),
        PrimaryKeyConstraint('id', name='orders_pkey')
    )

    id: str = Field(sa_column=Column('id', Text, primary_key=True))
    user_id: uuid.UUID = Field(sa_column=Column('user_id', Uuid, nullable=False))
    polar_product_id: str = Field(sa_column=Column('polar_product_id', Text, nullable=False))
    polar_price_id: str = Field(sa_column=Column('polar_price_id', Text, nullable=False))
    status: str = Field(sa_column=Column('status', Enum('paid', 'refunded', 'partially_refunded', name='order_status'), nullable=False, server_default=text("'paid'::order_status")))
    amount: int = Field(sa_column=Column('amount', Integer, nullable=False))
    currency: str = Field(sa_column=Column('currency', Text, nullable=False, server_default=text("'usd'::text")))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    updated_at: datetime.datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))

    user: Optional['Users'] = Relationship(back_populates='orders')


class Subscriptions(SQLModel, table=True):
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='subscriptions_user_id_users_id_fk'),
        PrimaryKeyConstraint('id', name='subscriptions_pkey')
    )

    id: str = Field(sa_column=Column('id', Text, primary_key=True))
    user_id: uuid.UUID = Field(sa_column=Column('user_id', Uuid, nullable=False))
    polar_product_id: str = Field(sa_column=Column('polar_product_id', Text, nullable=False))
    polar_price_id: str = Field(sa_column=Column('polar_price_id', Text, nullable=False))
    status: str = Field(sa_column=Column('status', Enum('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', name='subscription_status'), nullable=False, server_default=text("'incomplete'::subscription_status")))
    cancel_at_period_end: int = Field(sa_column=Column('cancel_at_period_end', Integer, nullable=False, server_default=text('0')))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    updated_at: datetime.datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    current_period_start: Optional[datetime.datetime] = Field(default=None, sa_column=Column('current_period_start', TIMESTAMP(True, 3)))
    current_period_end: Optional[datetime.datetime] = Field(default=None, sa_column=Column('current_period_end', TIMESTAMP(True, 3)))

    user: Optional['Users'] = Relationship(back_populates='subscriptions')


class UserChats(SQLModel, table=True):
    __tablename__ = 'user_chats'
    __table_args__ = (
        ForeignKeyConstraint(['chat_room_id'], ['chat_rooms.id'], ondelete='CASCADE', name='user_chats_chat_room_id_chat_rooms_id_fk'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='user_chats_user_id_users_id_fk'),
        PrimaryKeyConstraint('id', name='user_chats_pkey'),
        Index('user_chats_user_id_chat_room_id_key', 'user_id', 'chat_room_id', unique=True)
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    user_id: uuid.UUID = Field(sa_column=Column('user_id', Uuid, nullable=False))
    chat_room_id: int = Field(sa_column=Column('chat_room_id', Integer, nullable=False))

    chat_room: Optional['ChatRooms'] = Relationship(back_populates='user_chats')
    user: Optional['Users'] = Relationship(back_populates='user_chats')


class UserProfiles(SQLModel, table=True):
    __tablename__ = 'user_profiles'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='user_profiles_user_id_users_id_fk'),
        PrimaryKeyConstraint('id', name='user_profiles_pkey'),
        UniqueConstraint('email', name='user_profiles_email_unique'),
        UniqueConstraint('polar_customer_id', name='user_profiles_polar_customer_id_unique'),
        UniqueConstraint('user_id', name='user_profiles_user_id_unique')
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    first_name: str = Field(sa_column=Column('first_name', Text, nullable=False, server_default=text("''::text")))
    last_name: str = Field(sa_column=Column('last_name', Text, nullable=False, server_default=text("''::text")))
    user_id: uuid.UUID = Field(sa_column=Column('user_id', Uuid, nullable=False))
    email: str = Field(sa_column=Column('email', Text, nullable=False))
    phone_number: Optional[str] = Field(default=None, sa_column=Column('phone_number', Text))
    polar_customer_id: Optional[str] = Field(default=None, sa_column=Column('polar_customer_id', Text))

    user: Optional['Users'] = Relationship(back_populates='user_profiles')
    addresses: Optional['Addresses'] = Relationship(sa_relationship_kwargs={'uselist': False}, back_populates='profile')


class VirtualUsers(SQLModel, table=True):
    __tablename__ = 'virtual_users'
    __table_args__ = (
        ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE', name='virtual_users_owner_id_users_id_fk'),
        PrimaryKeyConstraint('id', name='virtual_users_pkey')
    )

    id: uuid.UUID = Field(sa_column=Column('id', Uuid, primary_key=True))
    name: str = Field(sa_column=Column('name', Text, nullable=False))
    owner_id: uuid.UUID = Field(sa_column=Column('owner_id', Uuid, nullable=False))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    updated_at: datetime.datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))

    owner: Optional['Users'] = Relationship(back_populates='virtual_users')
    messages: list['Messages'] = Relationship(back_populates='virtual_user')
    virtual_user_chats: list['VirtualUserChats'] = Relationship(back_populates='virtual_user')
    virtual_user_profiles: list['VirtualUserProfiles'] = Relationship(back_populates='virtual_user')


class Addresses(SQLModel, table=True):
    __table_args__ = (
        ForeignKeyConstraint(['profile_id'], ['user_profiles.id'], ondelete='CASCADE', name='addresses_profile_id_user_profiles_id_fk'),
        PrimaryKeyConstraint('id', name='addresses_pkey'),
        UniqueConstraint('profile_id', name='addresses_profile_id_unique')
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    street: str = Field(sa_column=Column('street', Text, nullable=False))
    city: str = Field(sa_column=Column('city', Text, nullable=False))
    state: str = Field(sa_column=Column('state', Text, nullable=False))
    postal_code: str = Field(sa_column=Column('postal_code', Text, nullable=False))
    country: str = Field(sa_column=Column('country', Text, nullable=False))
    profile_id: Optional[int] = Field(default=None, sa_column=Column('profile_id', Integer))

    profile: Optional['UserProfiles'] = Relationship(back_populates='addresses')


class Messages(SQLModel, table=True):
    __table_args__ = (
        CheckConstraint('sender_id IS NOT NULL AND virtual_user_id IS NULL OR sender_id IS NULL AND virtual_user_id IS NOT NULL', name='sender_check'),
        ForeignKeyConstraint(['chat_room_id'], ['chat_rooms.id'], ondelete='CASCADE', name='messages_chat_room_id_chat_rooms_id_fk'),
        ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE', name='messages_sender_id_users_id_fk'),
        ForeignKeyConstraint(['virtual_user_id'], ['virtual_users.id'], ondelete='CASCADE', name='messages_virtual_user_id_virtual_users_id_fk'),
        PrimaryKeyConstraint('id', name='messages_pkey')
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    chat_room_id: int = Field(sa_column=Column('chat_room_id', Integer, nullable=False))
    content: str = Field(sa_column=Column('content', Text, nullable=False))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    sender_id: Optional[uuid.UUID] = Field(default=None, sa_column=Column('sender_id', Uuid))
    virtual_user_id: Optional[uuid.UUID] = Field(default=None, sa_column=Column('virtual_user_id', Uuid))

    chat_room: Optional['ChatRooms'] = Relationship(back_populates='messages')
    sender: Optional['Users'] = Relationship(back_populates='messages')
    virtual_user: Optional['VirtualUsers'] = Relationship(back_populates='messages')


class VirtualUserChats(SQLModel, table=True):
    __tablename__ = 'virtual_user_chats'
    __table_args__ = (
        ForeignKeyConstraint(['chat_room_id'], ['chat_rooms.id'], ondelete='CASCADE', name='virtual_user_chats_chat_room_id_chat_rooms_id_fk'),
        ForeignKeyConstraint(['virtual_user_id'], ['virtual_users.id'], ondelete='CASCADE', name='virtual_user_chats_virtual_user_id_virtual_users_id_fk'),
        PrimaryKeyConstraint('id', name='virtual_user_chats_pkey'),
        Index('virtual_user_chats_virtual_user_id_chat_room_id_key', 'virtual_user_id', 'chat_room_id', unique=True)
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    virtual_user_id: uuid.UUID = Field(sa_column=Column('virtual_user_id', Uuid, nullable=False))
    chat_room_id: int = Field(sa_column=Column('chat_room_id', Integer, nullable=False))

    chat_room: Optional['ChatRooms'] = Relationship(back_populates='virtual_user_chats')
    virtual_user: Optional['VirtualUsers'] = Relationship(back_populates='virtual_user_chats')


class VirtualUserProfiles(SQLModel, table=True):
    __tablename__ = 'virtual_user_profiles'
    __table_args__ = (
        ForeignKeyConstraint(['virtual_user_id'], ['virtual_users.id'], ondelete='CASCADE', name='virtual_user_profiles_virtual_user_id_virtual_users_id_fk'),
        PrimaryKeyConstraint('id', name='virtual_user_profiles_pkey')
    )

    id: int = Field(sa_column=Column('id', Integer, primary_key=True))
    personality: str = Field(sa_column=Column('personality', Text, nullable=False, server_default=text("'friendly'::text")))
    tone: str = Field(sa_column=Column('tone', Text, nullable=False, server_default=text("'casual'::text")))
    knowledge_area: list[str] = Field(sa_column=Column('knowledge_area', ARRAY(Text()), nullable=False))
    backstory: str = Field(sa_column=Column('backstory', Text, nullable=False, server_default=text("''::text")))
    virtual_user_id: uuid.UUID = Field(sa_column=Column('virtual_user_id', Uuid, nullable=False))
    created_at: datetime.datetime = Field(sa_column=Column('created_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    updated_at: datetime.datetime = Field(sa_column=Column('updated_at', TIMESTAMP(True, 3), nullable=False, server_default=text('now()')))
    quirks: Optional[str] = Field(default=None, sa_column=Column('quirks', Text, server_default=text("''::text")))
    knowledge: Optional[dict] = Field(default=None, sa_column=Column('knowledge', JSONB))

    virtual_user: Optional['VirtualUsers'] = Relationship(back_populates='virtual_user_profiles')
