"""AI Brief service — generates world + tech briefs via LangChain + Ollama."""

import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brief import Brief
from app.models.brief_models import BriefLLMOutput, BriefResponse
from app.models.news import News
from app.repositories.brief_repository import BriefRepository
from config.logger import get_logger
from config.rss_sources import BRIEF_ARTICLES_PER_GROUP, TECH_SOURCES, WORLD_SOURCES
from config.settings import settings

logger = get_logger()

WORLD_PROMPT = (
    "You are a geopolitical intelligence analyst.\n\n"
    "Create a concise \"World Brief\" summarizing the most important global developments.\n\n"
    "Instructions:\n"
    "- Use only the provided news articles.\n"
    "- Identify major global events.\n"
    "- Group insights by region when possible.\n"
    "- Write in an intelligence briefing style.\n"
    "- Keep it concise.\n\n"
    "Articles:\n{articles}\n\n"
    "Return ONLY valid JSON, with no markdown, code fences, or extra text.\n"
    "The JSON must match this schema exactly:\n"
    '{{"key_developments": ["..."], "regional_highlights": {{"region": "..."}}, "emerging_trends": "..."}}'
)

TECH_PROMPT = (
    "You are a global technology intelligence analyst.\n\n"
    "From the following news articles create a \"Tech Brief\".\n\n"
    "Focus on:\n"
    "- AI innovation\n"
    "- product and platform launches\n"
    "- digital infrastructure and semiconductor signals\n"
    "- technology market direction\n\n"
    "Articles:\n{articles}\n\n"
    "Return ONLY valid JSON, with no markdown, code fences, or extra text.\n"
    "The JSON must match this schema exactly:\n"
    '{{"major_developments": ["..."], "technology_signals": ["..."], "risk_outlook": "..."}}'
)


class AIBriefService:
    # Initialize AI Brief service with repository and Ollama-backed LLM client.
    def __init__(self) -> None:
        self._brief_repo = BriefRepository()
        self._llm = ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            timeout=settings.ollama_timeout,
            num_predict=settings.ollama_num_predict,
        )

    # ---- public API ----

    # Return latest brief if present, otherwise generate and persist a new one.
    async def get_brief(self, db: AsyncSession) -> BriefResponse:
        existing = await self._brief_repo.get_latest(db)
        if existing:
            return self._to_response(existing)

        logger.info("brief_not_found_generating")
        return await self.regenerate_brief(db)

    # Force regeneration of briefs from latest articles and store the result.
    async def regenerate_brief(self, db: AsyncSession) -> BriefResponse:
        pipeline_start = time.perf_counter()
        logger.info("brief_generation_start")

        world_articles = await self._fetch_articles(db, WORLD_SOURCES)
        tech_articles = await self._fetch_articles(db, TECH_SOURCES)

        logger.info(
            "brief_articles_selected",
            extra={
                "world_count": len(world_articles),
                "tech_count": len(tech_articles),
            },
        )

        if not world_articles and not tech_articles:
            raise ValueError("No articles available for brief generation")

        world_text = self._format_articles(world_articles)
        tech_text = self._format_articles(tech_articles)

        world_brief_dict = await self._generate_section(
            WORLD_PROMPT, world_text, "world_brief"
        )
        tech_brief_dict = await self._generate_section(
            TECH_PROMPT, tech_text, "tech_brief"
        )

        row = await self._brief_repo.replace(db, world_brief_dict, tech_brief_dict)
        await db.commit()
        await db.refresh(row)

        pipeline_ms = (time.perf_counter() - pipeline_start) * 1000
        logger.info(
            "brief_generation_complete",
            extra={"pipeline_latency_ms": round(pipeline_ms, 2)},
        )

        return self._to_response(row)

    # ---- internal helpers ----

    # Load latest articles for given sources, limited per group for the brief.
    async def _fetch_articles(
        self, db: AsyncSession, sources: list[str]
    ) -> list[News]:
        stmt = (
            select(News)
            .where(News.source.in_(sources))
            .order_by(News.published_at.desc().nullslast())
            .limit(BRIEF_ARTICLES_PER_GROUP)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    # Turn articles into a compact bullet list string fed into the prompt.
    def _format_articles(articles: list[News]) -> str:
        parts: list[str] = []
        for a in articles:
            entry = f"- [{a.source}] {a.title}"
            if a.summary:
                entry += f": {a.summary}"
            if a.location:
                entry += f" (Location: {a.location})"
            parts.append(entry)
        return "\n".join(parts)

    # Call the LLM with a prompt and article text and parse the section JSON.
    async def _generate_section(
        self, prompt_template: str, articles_text: str, section_name: str
    ) -> dict:
        prompt = ChatPromptTemplate.from_template(prompt_template)
        chain = prompt | self._llm

        logger.info("llm_call_start", extra={"section": section_name})
        llm_start = time.perf_counter()

        response = await chain.ainvoke({"articles": articles_text})

        llm_ms = (time.perf_counter() - llm_start) * 1000

        token_usage = self._extract_token_usage(response)
        logger.info(
            "llm_call_complete",
            extra={
                "section": section_name,
                "llm_latency_ms": round(llm_ms, 2),
                **token_usage,
            },
        )

        parsed = self._parse_structured_output(response.content, section_name)
        return parsed

    @staticmethod
    # Extract token usage metrics from the LLM response metadata when available.
    def _extract_token_usage(response) -> dict:
        usage: dict = {}
        metadata = getattr(response, "response_metadata", {}) or {}

        if "prompt_eval_count" in metadata:
            usage["input_tokens"] = metadata["prompt_eval_count"]
        if "eval_count" in metadata:
            usage["output_tokens"] = metadata["eval_count"]
        if usage.get("input_tokens") and usage.get("output_tokens"):
            usage["total_tokens"] = usage["input_tokens"] + usage["output_tokens"]

        usage_info = getattr(response, "usage_metadata", None)
        if usage_info and not usage:
            usage["input_tokens"] = getattr(usage_info, "input_tokens", None)
            usage["output_tokens"] = getattr(usage_info, "output_tokens", None)
            total = getattr(usage_info, "total_tokens", None)
            if total:
                usage["total_tokens"] = total

        return {k: v for k, v in usage.items() if v is not None}

    @staticmethod
    def _extract_first_json_object(text: str) -> str | None:
        start = text.find("{")
        if start == -1:
            return None
        depth = 0
        in_string = False
        escape = False
        quote_char = None
        i = start
        while i < len(text):
            c = text[i]
            if escape:
                escape = False
                i += 1
                continue
            if c == "\\" and in_string:
                escape = True
                i += 1
                continue
            if not in_string:
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        return text[start : i + 1]
                elif c in ("'", '"'):
                    in_string = True
                    quote_char = c
            elif c == quote_char:
                in_string = False
            i += 1
        return None

    # Normalize raw LLM text into validated JSON dict for a brief section.
    def _parse_structured_output(self, raw_content: str, section_name: str) -> dict:
        import json

        content = raw_content.strip()

        if content.startswith("```"):
            lines = content.splitlines()
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines).strip()

        data = None
        try:
            if not content:
                raise json.JSONDecodeError("empty", content, 0)
            data = json.loads(content)
        except json.JSONDecodeError as e:
            data = None
            snippet = None
            if e.msg == "Extra data":
                snippet = self._extract_first_json_object(content)
            if not snippet:
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1 and end > start:
                    snippet = content[start : end + 1]
            if snippet:
                try:
                    data = json.loads(snippet)
                except json.JSONDecodeError as e2:
                    if e2.msg == "Extra data":
                        first_only = self._extract_first_json_object(snippet)
                        if first_only:
                            try:
                                data = json.loads(first_only)
                            except json.JSONDecodeError:
                                pass
                    if data is None:
                        logger.error(
                            "llm_output_parse_failed",
                            extra={
                                "section": section_name,
                                "raw_content": content[:500],
                                "snippet": snippet[:500],
                            },
                        )
                        raise ValueError(
                            f"LLM returned invalid JSON for {section_name}"
                        )
            else:
                logger.error(
                    "llm_output_parse_failed_no_braces",
                    extra={
                        "section": section_name,
                        "raw_content": content[:500],
                    },
                )
                raise ValueError(
                    f"LLM returned invalid JSON for {section_name}"
                )

        if data is None:
            raise ValueError(f"LLM returned invalid JSON for {section_name}")

        if section_name == "world_brief":
            validated = BriefLLMOutput(
                world_brief=data,
                tech_brief={"major_developments": [], "technology_signals": [], "risk_outlook": ""},
            )
            return validated.world_brief.model_dump()

        validated = BriefLLMOutput(
            world_brief={"key_developments": [], "regional_highlights": {}, "emerging_trends": ""},
            tech_brief=data,
        )
        return validated.tech_brief.model_dump()

    @staticmethod
    # Convert a Brief ORM row into the public API response shape.
    def _to_response(row: Brief) -> BriefResponse:
        return BriefResponse(
            world_brief=row.world_brief,
            tech_brief=row.tech_brief,
            generated_at=row.created_at,
        )
