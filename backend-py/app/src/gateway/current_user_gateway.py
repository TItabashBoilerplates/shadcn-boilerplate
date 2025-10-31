from sqlmodel import Session, select

from src.domain.entity.models import GeneralUser
from src.infra.supabase_client import SupabaseClient


class CurrentUserGateway:
    def __init__(self, access_token: str | None = None):
        """Initialize the gateway with the Supabase client."""
        self.supabase_client = SupabaseClient(access_token)

    def get_current_user(self, session: Session) -> GeneralUser | None:
        """Get the current user from the database."""
        user = self.supabase_client.get_user()
        if user is None:
            raise Exception("User not found")

        statement = select(GeneralUser).where(GeneralUser.id == user.id)
        return session.exec(statement).first()
