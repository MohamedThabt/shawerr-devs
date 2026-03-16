"""Pydantic schemas for AI Brief API and LLM structured output."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def _coerce_to_str(value: object) -> str:
    """Join list items into a single string when the LLM returns a list instead of str."""
    if isinstance(value, list):
        return "; ".join(str(item) for item in value)
    return str(value) if value is not None else ""


def _coerce_dict_values_to_str(value: object) -> dict[str, str]:
    """Ensure every dict value is a string, joining lists when needed."""
    if not isinstance(value, dict):
        return {}
    return {k: _coerce_to_str(v) for k, v in value.items()}


# --- LLM structured output schemas ---

class WorldBriefOutput(BaseModel):
    key_developments: list[str] = Field(default_factory=list)
    regional_highlights: dict[str, str] = Field(default_factory=dict)
    emerging_trends: str = ""

    @field_validator("regional_highlights", mode="before")
    @classmethod
    def _normalize_highlights(cls, v: object) -> dict[str, str]:
        return _coerce_dict_values_to_str(v)

    @field_validator("emerging_trends", mode="before")
    @classmethod
    def _normalize_trends(cls, v: object) -> str:
        return _coerce_to_str(v)


class TechBriefOutput(BaseModel):
    major_developments: list[str] = Field(default_factory=list)
    technology_signals: list[str] = Field(default_factory=list)
    risk_outlook: str = ""

    @field_validator("risk_outlook", mode="before")
    @classmethod
    def _normalize_risk(cls, v: object) -> str:
        return _coerce_to_str(v)


class BriefLLMOutput(BaseModel):
    world_brief: WorldBriefOutput
    tech_brief: TechBriefOutput


# --- API response schema ---

class BriefResponse(BaseModel):
    world_brief: dict | None = None
    tech_brief: dict | None = None
    generated_at: datetime | None = None
