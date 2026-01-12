"""このモジュールは、Supabaseクライアントを作成し、環境変数からSupabaseのURLとキーを取得します。."""

import contextlib
import os

from supabase import Client, create_client
from supabase_auth.types import User

from domain.exceptions import AuthenticationError, ConfigurationError
from infra.logging import get_logger

logger = get_logger(__name__)


class SupabaseClient:
    def __init__(self, access_token: str | None = None) -> None:
        self.url: str | None = os.getenv("SUPABASE_URL")
        self.key: str | None = os.getenv("SUPABASE_PUBLISHABLE_KEY")
        self.user = None

        if self.url is None or self.key is None:
            msg = "supabase url or publishable key is not set"
            raise ConfigurationError(msg)

        self.client: Client = create_client(
            self.url,
            self.key,
        )

        if access_token is not None:
            logger.info("access token: %s", access_token)
            try:
                user_response = self.client.auth.get_user(access_token)
            except Exception as e:
                msg = "Failed to get user"
                raise AuthenticationError(msg) from e
            if user_response is None:
                msg = "User response is None"
                raise AuthenticationError(msg)
            self.user = user_response.user
            if self.user is None:
                return
            self.client.postgrest.auth(token=access_token)

    def get_user(self) -> User | None:
        return self.user


# クライアントのインスタンス化と利用例
if __name__ == "__main__":
    with contextlib.suppress(Exception):
        supabase = SupabaseClient()
