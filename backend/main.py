from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.db.base import Base
from app.db.session import engine
from app.models.brief import Brief  # noqa: F401 — register model metadata
from app.models.news import News  # noqa: F401
from config.exceptions import register_exception_handlers
from config.limiter import limiter
from config.logger import setup_logging
from config.middleware import RequestLoggingMiddleware
from config.settings import settings
from routes.api import router as api_router
from scheduler.scheduler import shutdown_scheduler, start_scheduler

setup_logging()
# Hardcoded CORS origins for production deployment Because Dokploy  environment variables problem
HARDCODED_CORS_ORIGINS = [
    "https://worldmonitor.sirthabet.dev",
]


# Parse CORS origins from environment variable
def parse_cors_origins(raw_origins: str) -> list[str]:
    origins: list[str] = []
    for origin in raw_origins.split(","):
        normalized_origin = origin.strip().strip('"').strip("'").rstrip("/")
        if normalized_origin:
            origins.append(normalized_origin)
    return origins


def get_allowed_origins() -> list[str]:
    env_origins = parse_cors_origins(settings.cors_origins)
    ordered_origins = [*HARDCODED_CORS_ORIGINS, *env_origins]
    # Keep order while removing duplicates.
    return list(dict.fromkeys(ordered_origins))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    yield
    # Shutdown scheduler and dispose engine on shutdown
    shutdown_scheduler()
    await engine.dispose()


_is_production = settings.app_env.lower() == "production"
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
register_exception_handlers(app)

app.include_router(api_router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "API is running"}
