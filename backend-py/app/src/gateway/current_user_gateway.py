from prisma.models import GeneralUser

from infra.prisma_client import PrismaClient
from infra.supabase_client import SupabaseClient


class CurrentUserGateway:
    def __init__(self, access_token: str | None = None):
        """Initialize the gateway with the Supabase and Prisma clients."""
        self.supabase_client = SupabaseClient(access_token)
        self.prisma_client = PrismaClient()

    async def get_current_user(self) -> GeneralUser | None:
        """Get the current user from the database."""
        user = self.supabase_client.get_user()
        if user is None:
            raise Exception("User not found")
        async with self.prisma_client as prisma:
            general_user: GeneralUser | None = await prisma.generaluser.find_unique(
                where={
                    "auth_id": user.id,
                },
            )
            return general_user
