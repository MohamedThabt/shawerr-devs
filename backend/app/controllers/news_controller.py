"""Controller for news-related endpoints."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news_models import NewsResponse
from app.repositories.news_repository import NewsRepository
from app.services.rss_service import RSSService


class NewsController:
    def __init__(self) -> None:
        self._rss_service = RSSService()
        self._news_repository = NewsRepository()

    async def get_news(self, db: AsyncSession, limit: int = 50) -> NewsResponse:
        rows = await self._news_repository.list_latest(db, limit=limit)
        articles = [self._news_repository.to_news_item(row) for row in rows]
        return NewsResponse(count=len(articles), articles=articles)

    async def ingest_news(self, db: AsyncSession, limit: int = 50) -> NewsResponse:
        articles = await self._rss_service.fetch_all_feeds()
        await self._news_repository.replace_many_by_source(db, articles)
        return await self.get_news(db, limit=limit)
