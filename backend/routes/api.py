"""API route definitions."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.brief_controller import BriefController
from app.controllers.map_controller import MapController
from app.controllers.news_controller import NewsController
from app.db.session import get_db
from app.models.brief_models import BriefResponse
from app.models.news_models import NewsResponse
from config.limiter import limiter

router = APIRouter()

news_controller = NewsController()
brief_controller = BriefController()
map_controller = MapController()


@router.get("/news", response_model=NewsResponse)
@limiter.limit("30/minute")
async def get_news(request: Request, db: AsyncSession = Depends(get_db)) -> NewsResponse:
    """Return the latest persisted news from database."""

    return await news_controller.get_news(db)


@router.get("/ai-briefs", response_model=BriefResponse)
@limiter.limit("30/minute")
async def get_briefs(request: Request, db: AsyncSession = Depends(get_db)) -> BriefResponse:
    """Return the latest AI-generated briefs, generating if none exist."""

    return await brief_controller.get_brief(db)


@router.get("/map", response_model=NewsResponse)
@limiter.limit("3/minute")
async def get_map_news(request: Request, db: AsyncSession = Depends(get_db)) -> NewsResponse:
    """Return news articles that have geolocation coordinates."""

    return await map_controller.get_map_news(db)
