"""APScheduler configuration — runs the world monitor pipeline on interval."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from scheduler.jobs import run_pipeline_job

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    """Configure and start the scheduler with a 30-minute interval job."""
    scheduler.add_job(
        run_pipeline_job,
        trigger="interval",
        minutes=30,
        max_instances=1,
        coalesce=True,
        id="world_monitor_pipeline",
    )
    scheduler.start()


def shutdown_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
