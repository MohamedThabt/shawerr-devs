"""Scheduler job definitions."""

from pipelines.world_monitor_pipeline import run_world_monitor_pipeline


async def run_pipeline_job() -> None:
    """Scheduled wrapper for the world monitor pipeline."""
    await run_world_monitor_pipeline()
