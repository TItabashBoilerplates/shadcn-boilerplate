from uuid import UUID

from sqlmodel import Session, select

from domain.entity.models import GeneralUsers
from domain.exceptions import AuthenticationError
from infra.supabase_client import SupabaseClient


class CurrentUserGateway:
    def __init__(self, access_token: str | None = None) -> None:
        """Initialize the gateway with the Supabase client."""
        self.supabase_client = SupabaseClient(access_token)

    def get_current_user(self, session: Session) -> GeneralUsers | None:
        """Get the current user from the database."""
        user = self.supabase_client.get_user()
        if user is None:
            msg = "User not found"
            raise AuthenticationError(msg)

        # Supabase UserのidはstrなのでUUIDに変換
        user_uuid = UUID(user.id)
        statement = select(GeneralUsers).where(GeneralUsers.id == user_uuid)
        return session.exec(statement).first()
