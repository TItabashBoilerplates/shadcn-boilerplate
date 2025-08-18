import uuid
from datetime import datetime

from prisma import Prisma
from prisma.models import VirtualUser
from prisma.types import (
    VirtualUserCreateInput,
    VirtualUserUpdateInput,
    VirtualUserWhereInput,
    VirtualUserWhereUniqueInput,
)


class VirtualUserGateway:
    async def create(
        self,
        name: str,
        owner_id: str,
        prisma: Prisma,
    ) -> VirtualUser:
        create_input = VirtualUserCreateInput(
            id=str(uuid.uuid4()),
            name=name,
            ownerId=owner_id,
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
        )
        result: VirtualUser = await prisma.virtualuser.create(data=create_input)
        return result

    async def get_by_id(
        self,
        virtual_user_id: str,
        prisma: Prisma,
    ) -> VirtualUser | None:
        where_input = VirtualUserWhereUniqueInput(id=virtual_user_id)
        result = await prisma.virtualuser.find_unique(where=where_input)
        return result if isinstance(result, VirtualUser) else None

    async def get_all(self, prisma: Prisma) -> list[VirtualUser]:
        results = await prisma.virtualuser.find_many()
        return [result for result in results if isinstance(result, VirtualUser)]

    async def get_by_owner_id(
        self,
        owner_id: str,
        prisma: Prisma,
    ) -> list[VirtualUser]:
        where_input = VirtualUserWhereInput(ownerId=owner_id)
        results = await prisma.virtualuser.find_many(where=where_input)
        return [result for result in results if isinstance(result, VirtualUser)]

    async def update(
        self,
        virtual_user_id: str,
        name: str,
        prisma: Prisma,
    ) -> VirtualUser:
        where_input = VirtualUserWhereUniqueInput(id=virtual_user_id)
        update_input = VirtualUserUpdateInput(name=name, updatedAt=datetime.now())
        result: VirtualUser | None = await prisma.virtualuser.update(
            where=where_input,
            data=update_input,
        )
        if result is None:
            raise ValueError("VirtualUser not found")
        return result

    async def delete(
        self,
        virtual_user_id: str,
        prisma: Prisma,
    ) -> VirtualUser:
        where_input = VirtualUserWhereUniqueInput(id=virtual_user_id)
        result: VirtualUser | None = await prisma.virtualuser.delete(where=where_input)
        if result is None:
            raise ValueError("VirtualUser not found")
        return result
