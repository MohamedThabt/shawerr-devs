"""World Monitor pipeline — fetches RSS articles, then generates AI briefs."""

from app.db.session import async_session
from app.repositories.news_repository import NewsRepository
from app.services.ai_brief_service import AIBriefService
from app.services.rss_service import RSSService
from config.logger import get_logger

logger = get_logger()


async def run_world_monitor_pipeline() -> None:
    """Run the full ingestion pipeline: RSS fetch → store → AI brief generation."""
    logger.info("pipeline_start")

    rss_service = RSSService()
    news_repo = NewsRepository()
    brief_service = AIBriefService()

    # Step 1: Fetch and store RSS articles
    try:
        articles = await rss_service.fetch_all_feeds()
        async with async_session() as db:
            count = await news_repo.replace_many_by_source(db, articles)
        logger.info("pipeline_rss_complete", extra={"articles_stored": count})
    except Exception:
        logger.exception("pipeline_rss_failed")
        return

    # Step 2: Generate AI briefs from the stored articles
    try:
        async with async_session() as db:
            await brief_service.regenerate_brief(db)
        logger.info("pipeline_brief_complete")
    except Exception:
        logger.exception("pipeline_brief_failed")

    logger.info("pipeline_finished")
