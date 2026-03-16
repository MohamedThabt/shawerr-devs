"""Repository for brief persistence and retrieval."""

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brief import Brief
from config.logger import get_logger

logger = get_logger()


class BriefRepository:
    # Fetch the most recently created brief row if it exists.
    async def get_latest(self, db: AsyncSession) -> Brief | None:
        stmt = select(Brief).order_by(Brief.created_at.desc()).limit(1)
        result = await db.execute(stmt)
        row = result.scalar_one_or_none()

        if row:
            logger.info("brief_fetch_hit", extra={"brief_id": row.id})
        else:
            logger.info("brief_fetch_miss")

        return row

    # Delete all existing briefs and stage a new one on the current session transaction.
    async def replace(
        self,
        db: AsyncSession,
        world_brief: dict,
        tech_brief: dict,
    ) -> Brief:
        logger.info("brief_replace_start")
        await db.execute(delete(Brief))
        logger.info("brief_old_rows_deleted")

        row = Brief(world_brief=world_brief, tech_brief=tech_brief)
        db.add(row)
        await db.flush()
        logger.info("brief_new_row_inserted", extra={"brief_id": row.id})

        return row
