"""Controller for map-related endpoints."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news_models import NewsResponse
from app.repositories.news_repository import NewsRepository


class MapController:
    def __init__(self) -> None:
        self._news_repository = NewsRepository()

    async def get_map_news(self, db: AsyncSession, limit: int = 200) -> NewsResponse:
        rows = await self._news_repository.list_with_location(db, limit=limit)
        articles = [self._news_repository.to_news_item(row) for row in rows]
        return NewsResponse(count=len(articles), articles=articles)
