"""このモジュールは、Prismaクライアントを作成し、データベースへの接続と切断を管理します。

このクライアントは、データベースへの非同期接続を提供し、コンテキストマネージャとしても機能します。
"""

import asyncio

from prisma import Prisma


class PrismaClient:
    def __init__(self) -> None:
        self.client = Prisma()

    async def _connect(self) -> None:
        await self.client.connect()

    async def _disconnect(self) -> None:
        await self.client.disconnect()

    async def __aenter__(self) -> Prisma:
        await self._connect()
        return self.client

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        await self._disconnect()


async def main():
    async with PrismaClient() as client:
        # Prismaクライアントの操作をここに記述
        print("Success")


if __name__ == "__main__":
    asyncio.run(main())
