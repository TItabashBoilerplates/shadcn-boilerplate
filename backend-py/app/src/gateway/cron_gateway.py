from typing import Any

from prisma import Prisma


class PgCronGateway:
    def __init__(self, prisma: Prisma):
        self.prisma = prisma

    async def create_job(
        self,
        schedule: str,
        function_url: str,
        anon_key: str,
        request_body: dict[str, Any],
        timeout_ms: int = 5000,
    ) -> dict[str, Any] | None:
        query = self._build_create_job_query(
            schedule,
            function_url,
            anon_key,
            request_body,
            timeout_ms,
        )
        result = await self.prisma.query_raw(query)
        return result[0] if result else None

    def _build_create_job_query(
        self,
        schedule: str,
        function_url: str,
        anon_key: str,
        request_body: dict[str, Any],
        timeout_ms: int,
    ) -> str:
        body = ", ".join(
            [f"'{k}', {self._format_value(v)}" for k, v in request_body.items()],
        )
        command = f"""
        select
            net.http_post(
                url:='{function_url}',
                headers:=jsonb_build_object('Content-Type','application/json', 'Authorization', 'Bearer ' || '{anon_key}'),
                body:=jsonb_build_object(
                    'time', now(),
                    'job_name', cron.job_name(),
                    {body}
                ),
                timeout_milliseconds:={timeout_ms}
            ) as request_id;
        """

        return f"""
        select cron.schedule(
            'job_' || gen_random_uuid()::text,
            '{schedule}',
            $${command}$$
        );
        """

    def _format_value(self, value: Any) -> str:
        if isinstance(value, str):
            return f"'{value}'"
        if isinstance(value, (int, float)):
            return str(value)
        if isinstance(value, bool):
            return str(value).lower()
        return f"'{value!s}'"

    async def delete_job(self, job_name: str) -> dict[str, Any] | None:
        query = f"SELECT cron.unschedule('{job_name}');"
        result = await self.prisma.query_raw(query)
        return result[0] if result else None

    async def get_all_jobs(self) -> list[dict[str, Any]]:
        query = "SELECT * FROM cron.job;"
        return await self.prisma.query_raw(query)

    async def get_job_by_name(self, job_name: str) -> dict[str, Any] | None:
        query = f"SELECT * FROM cron.job WHERE jobname = '{job_name}';"
        result = await self.prisma.query_raw(query)
        return result[0] if result else None

    async def update_job(
        self,
        job_name: str,
        schedule: str | None = None,
        command: str | None = None,
        active: bool | None = None,
    ) -> dict[str, Any] | None:
        updates = []
        if schedule:
            updates.append(f"schedule = '{schedule}'")
        if command:
            updates.append(f"command = $${command}$$")
        if active is not None:
            updates.append(f"active = {str(active).lower()}")

        if not updates:
            raise ValueError("No updates provided")

        update_str = ", ".join(updates)
        query = f"UPDATE cron.job SET {update_str} WHERE jobname = '{job_name}' RETURNING *;"
        result = await self.prisma.query_raw(query)
        return result[0] if result else None
