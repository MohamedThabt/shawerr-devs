"""Controller for AI Brief endpoints."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brief_models import BriefResponse
from app.services.ai_brief_service import AIBriefService


class BriefController:
    # Create a controller instance wired to the AI Brief service.
    def __init__(self) -> None:
        self._service = AIBriefService()

    # Handle GET /briefs by returning or generating the latest brief.
    async def get_brief(self, db: AsyncSession) -> BriefResponse:
        return await self._service.get_brief(db)

    # Handle POST /briefs/regenerate by forcing a fresh brief generation.
    async def regenerate_brief(self, db: AsyncSession) -> BriefResponse:
        return await self._service.regenerate_brief(db)
