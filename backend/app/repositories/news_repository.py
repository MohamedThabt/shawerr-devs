"""Repository helpers for news persistence and retrieval."""

from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from hashlib import sha256

from sqlalchemy import and_, delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import News
from app.models.news_models import NewsItem
from config.logger import get_logger

logger = get_logger()


class NewsRepository:
    # Fetch news rows that have coordinates, ordered by published date and id.
    async def list_with_location(self, db: AsyncSession, limit: int = 200) -> list[News]:
        stmt = (
            select(News)
            .where(News.lat.is_not(None), News.lon.is_not(None))
            .order_by(News.published_at.desc().nullslast(), News.id.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    # Fetch the most recent news rows ordered by published date and id.
    async def list_latest(self, db: AsyncSession, limit: int = 50) -> list[News]:
        stmt = (
            select(News)
            .order_by(News.published_at.desc().nullslast(), News.id.desc())
            .limit(limit)
        )
        logger.info("Executing latest news query", extra={"entries_count": limit})
        result = await db.execute(stmt)
        rows = list(result.scalars().all())
        logger.info("Latest news query completed", extra={"fetched": len(rows)})
        return rows

    # Replace all stored rows for involved sources with the latest fetched items.
    async def replace_many_by_source(
        self,
        db: AsyncSession,
        items: list[NewsItem],
        fetched_at: datetime | None = None,
    ) -> int:
        if not items:
            return 0

        fetched_at = fetched_at or datetime.now(UTC)
        payload = [self._to_row(item, fetched_at) for item in items if item.link]
        if not payload:
            return 0

        # Keep only one row per link to avoid same-batch unique violations.
        deduped_by_link: dict[str, dict] = {}
        for row in payload:
            deduped_by_link[row["link"]] = row
        payload = list(deduped_by_link.values())

        sources = sorted({row["source"] for row in payload})
        incoming_links = [row["link"] for row in payload]
        delete_stmt = delete(News).where(
            and_(News.source.in_(sources), ~News.link.in_(incoming_links))
        )

        insert_stmt = pg_insert(News).values(payload)
        upsert_stmt = insert_stmt.on_conflict_do_update(
            index_elements=[News.link],
            set_={
                "source": insert_stmt.excluded.source,
                "title": insert_stmt.excluded.title,
                "published_at": insert_stmt.excluded.published_at,
                "summary": insert_stmt.excluded.summary,
                "location": insert_stmt.excluded.location,
                "lat": insert_stmt.excluded.lat,
                "lon": insert_stmt.excluded.lon,
                "location_type": insert_stmt.excluded.location_type,
                "content_hash": insert_stmt.excluded.content_hash,
                "last_fetched_at": insert_stmt.excluded.last_fetched_at,
            },
        )

        logger.info(
            "Replacing news rows by source",
            extra={"source": ",".join(sources), "entries_count": len(payload)},
        )
        async with db.begin():
            logger.info("Deleting existing source rows before insert")
            await db.execute(delete_stmt)
            logger.info("Upserting replacement source rows")
            await db.execute(upsert_stmt)
        logger.info("Source replacement completed", extra={"fetched": len(payload)})
        return len(payload)

    @staticmethod
    # Convert an ORM News row into the API NewsItem shape.
    def to_news_item(row: News) -> NewsItem:
        return NewsItem(
            source=row.source,
            title=row.title,
            link=row.link,
            published_at=row.published_at.isoformat() if row.published_at else None,
            summary=row.summary,
            location=row.location,
            lat=row.lat,
            lon=row.lon,
            location_type=row.location_type,
        )

    @staticmethod
    # Parse RSS/ISO date text into a timezone-aware datetime when possible.
    def _parse_published_at(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            parsed = parsedate_to_datetime(value)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except (TypeError, ValueError):
            try:
                parsed = datetime.fromisoformat(value)
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
            except ValueError:
                return None

    @classmethod
    # Normalize incoming item fields into a dictionary suitable for SQL insert.
    def _to_row(cls, item: NewsItem, fetched_at: datetime) -> dict:
        normalized_title = item.title.strip()
        normalized_source = item.source.strip()
        normalized_link = item.link.strip()
        published = cls._parse_published_at(item.published_at)
        hash_input = (
            f"{normalized_source}|{normalized_title}|"
            f"{normalized_link}|{item.published_at or ''}"
        )
        return {
            "source": normalized_source,
            "title": normalized_title,
            "link": normalized_link,
            "published_at": published,
            "summary": item.summary,
            "location": item.location,
            "lat": item.lat,
            "lon": item.lon,
            "location_type": item.location_type,
            "content_hash": sha256(hash_input.encode("utf-8")).hexdigest(),
            "last_fetched_at": fetched_at,
        }
