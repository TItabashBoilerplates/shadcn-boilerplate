"""このモジュールは、Supabaseクライアントを作成し、環境変数からSupabaseのURLとキーを取得します。"""

import os
from logging import getLogger

from gotrue.types import User
from supabase import Client, create_client

logger = getLogger("uvicorn")


class SupabaseClient:
    def __init__(self, access_token: str | None = None) -> None:
        self.url: str | None = os.getenv("SUPABASE_URL")
        self.key: str | None = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.user = None

        if self.url is None or self.key is None:
            raise Exception("supabase url or anon key is not set")

        self.client: Client = create_client(
            self.url,
            self.key,
        )

        if access_token is not None:
            logger.info(f"access token: {access_token}")
            try:
                user_response = self.client.auth.get_user(access_token)
            except Exception:
                raise Exception("Failed to get user")
            self.user = user_response.user
            if self.user is None:
                return
            self.client.postgrest.auth(token=access_token)

    def get_user(self) -> User | None:
        return self.user


# クライアントのインスタンス化と利用例
if __name__ == "__main__":
    try:
        supabase = SupabaseClient()
        print("Client: ", supabase.client)
    except Exception as e:
        print("An error occurred:", e)
