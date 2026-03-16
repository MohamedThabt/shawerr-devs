"""Pydantic models for news APIs and RSS normalization."""

from pydantic import BaseModel


class NewsItem(BaseModel):
    source: str
    title: str
    link: str
    published_at: str | None = None
    summary: str | None = None
    location: str | None = None
    lat: float | None = None
    lon: float | None = None
    location_type: str | None = None


class NewsResponse(BaseModel):
    count: int
    articles: list[NewsItem]
