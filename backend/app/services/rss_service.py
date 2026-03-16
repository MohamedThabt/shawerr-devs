"""RSS feed fetching and parsing service."""

import asyncio

import feedparser
import httpx

from app.models.news_models import NewsItem
from app.services.location_service import LocationExtractorService
from config.logger import get_logger
from config.rss_sources import RSS_FEEDS

logger = get_logger()

MAX_ENTRIES_PER_FEED = 10


class RSSService:
    """Fetches, parses, and normalises RSS feeds into NewsItem objects."""

    # Initialize RSS service dependencies for article location enrichment.
    def __init__(self) -> None:
        self._location_service = LocationExtractorService()

    # Enrich one article with extracted location coordinates and type.
    async def normalize_article(self, article: NewsItem) -> NewsItem:
        """Enrich *article* with the best extracted location."""
        text = f"{article.title} {article.summary or ''}"
        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                self._location_service.extract_best_location_from_text,
                text,
            )
            if result:
                article = article.model_copy(update={
                    "location": result["name"],
                    "lat": result["lat"],
                    "lon": result["lon"],
                    "location_type": result["type"],
                })
            else:
                logger.debug(
                    "article_no_location",
                    extra={"article_title": article.title},
                )
        except Exception:
            logger.exception(
                "article_normalize_failed",
                extra={"article_title": article.title},
            )
        return article

    # Fetch all configured RSS feeds concurrently and normalize all articles.
    async def fetch_all_feeds(self) -> list[NewsItem]:
        """Fetch all configured RSS feeds concurrently and return a flat article list."""

        sources = list(RSS_FEEDS.keys())

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            tasks = [
                self._fetch_feed(client, source, RSS_FEEDS[source])
                for source in sources
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        articles: list[NewsItem] = []
        failed_sources: list[str] = []

        for source, result in zip(sources, results):
            if result is None or isinstance(result, Exception):
                failed_sources.append(source)
            else:
                articles.extend(result)

        logger.info(
            "feeds_summary",
            extra={
                "fetched": len(sources) - len(failed_sources),
                "failed": len(failed_sources),
                "failed_sources": failed_sources,
            },
        )

        articles = [
            await self.normalize_article(a) for a in articles
        ]

        located = sum(1 for a in articles if a.location)
        logger.info(
            "normalization_summary",
            extra={
                "total_articles": len(articles),
                "with_location": located,
                "without_location": len(articles) - located,
            },
        )

        return articles

    # Fetch and parse one RSS source into normalized NewsItem entries.
    async def _fetch_feed(
        self, client: httpx.AsyncClient, source: str, url: str
    ) -> list[NewsItem] | None:
        """Fetch a single RSS feed and return normalised articles."""

        logger.info("fetching_feed", extra={"source": source, "url": url})

        try:
            response = await client.get(url)
            response.raise_for_status()
        except Exception:
            logger.exception("feed_fetch_failed", extra={"source": source, "url": url})
            return None

        logger.info(
            "feed_fetched",
            extra={"source": source, "status_code": response.status_code},
        )

        feed = feedparser.parse(response.text)
        entries = feed.entries[:MAX_ENTRIES_PER_FEED]

        articles = [
            NewsItem(
                source=source,
                title=entry.get("title", ""),
                link=entry.get("link", ""),
                published_at=(
                    entry.get("published")
                    or entry.get("updated")
                    or entry.get("pubDate")
                ),
                summary=entry.get("summary"),
            )
            for entry in entries
        ]

        logger.info(
            "feed_parsed",
            extra={"source": source, "entries_count": len(articles)},
        )

        return articles
