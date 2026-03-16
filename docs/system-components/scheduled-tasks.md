# Scheduled Tasks

## Purpose
This document describes the periodic scheduling layer for World Monitor — how background tasks are triggered, what each task does, and how the components fit together.

For the RSS ingestion pipeline internals, see [news-pipeline.md](news-pipeline.md).
For the AI brief generation internals, see [ai-brief-service.md](ai-brief-service.md).

---

## 1. Component Architecture

APScheduler runs inside the FastAPI process. On startup the lifespan hook registers one interval job that fires the pipeline directly — no broker, no separate worker process, no Redis.

```mermaid
graph TB
    subgraph FastAPI["FastAPI Process (uvicorn --workers 1)"]
        LIFESPAN["lifespan()\nmain.py"]
        SCHED["AsyncIOScheduler\nscheduler/scheduler.py"]
        JOB["run_pipeline_job()\nscheduler/jobs.py"]
        PIPE["run_world_monitor_pipeline()\npipelines/world_monitor_pipeline.py"]
    end

    subgraph Services["Application Services"]
        RSS_S["RSSService\nfetch + normalize"]
        BRF_S["AIBriefService\nregenerate brief"]
    end

    subgraph Storage["Storage & AI"]
        DB[("PostgreSQL\nnews / briefs")]
        OL["Ollama\nllama3.2"]
    end

    LIFESPAN -->|"start_scheduler()"| SCHED
    SCHED -->|"every 30 min"| JOB
    JOB --> PIPE
    PIPE -->|"step 1"| RSS_S
    PIPE -->|"step 2 — after RSS"| BRF_S
    RSS_S -->|"upsert articles"| DB
    BRF_S -->|"read articles"| DB
    BRF_S -->|"LLM prompt"| OL
    OL -->|"structured JSON"| BRF_S
    BRF_S -->|"replace brief"| DB

    style FastAPI fill:#0d1b2a,stroke:#1b9aaa,stroke-width:2px,color:#e0e0e0
    style Services fill:#0d1b2a,stroke:#00d4aa,stroke-width:2px,color:#e0e0e0
    style Storage fill:#0d1b2a,stroke:#f8b739,stroke-width:2px,color:#e0e0e0
    style LIFESPAN fill:#16213e,stroke:#1b9aaa,color:#e0e0e0
    style SCHED fill:#16213e,stroke:#1b9aaa,color:#e0e0e0
    style JOB fill:#16213e,stroke:#e77f67,color:#e0e0e0
    style PIPE fill:#16213e,stroke:#e77f67,color:#e0e0e0
    style RSS_S fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style BRF_S fill:#16213e,stroke:#a29bfe,color:#e0e0e0
    style DB fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
    style OL fill:#1a1a2e,stroke:#a29bfe,color:#e0e0e0
```

---

## 2. Schedule

One job runs the full pipeline sequentially every 30 minutes. RSS ingestion always completes before brief generation begins.

| Job ID | Trigger | Interval | Overlap policy |
|:-------|:--------|:---------|:---------------|
| `world_monitor_pipeline` | `interval` | 30 minutes | `max_instances=1` — skips if previous run is still active |

`coalesce=True` — if the server was paused and multiple intervals were missed, only one catch-up run fires.

```mermaid
graph LR
    T00["HH:00\nRSS fetch + store\nAI brief generation"]
    T30["HH:30\nRSS fetch + store\nAI brief generation"]
    T60["HH+1:00\nRSS fetch + store\nAI brief generation"]

    T00 --> T30 --> T60

    style T00 fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style T30 fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style T60 fill:#16213e,stroke:#00d4aa,color:#e0e0e0
```

---

## 3. Pipeline Steps

### Step 1 — RSS Ingestion

**Called by:** `run_world_monitor_pipeline()` → `RSSService.fetch_all_feeds()` + `NewsRepository.replace_many_by_source()`

```mermaid
flowchart TD
    SCHED["APScheduler\ninterval trigger"]
    SCHED --> PIPE["run_world_monitor_pipeline()\npipelines/world_monitor_pipeline.py"]
    PIPE --> FETCH["RSSService.fetch_all_feeds()\nhttpx AsyncClient"]
    FETCH --> GATHER["asyncio.gather\n10 feeds concurrently"]
    GATHER --> PARSE["feedparser.parse\nnormalize to NewsItem"]
    PARSE --> NER["LocationExtractorService\nspaCy NER + geocoding"]
    NER --> SESSION["async_session()\nopen DB session"]
    SESSION --> UPSERT["NewsRepository\nreplace_many_by_source()"]
    UPSERT --> TX{"Write\nsuccessful?"}
    TX -- Yes --> STEP2["proceed to AI brief"]
    TX -- No --> FAIL["log pipeline_rss_failed\nstop pipeline"]

    style SCHED fill:#16213e,stroke:#1b9aaa,color:#e0e0e0
    style PIPE fill:#16213e,stroke:#e77f67,color:#e0e0e0
    style FETCH fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style GATHER fill:#16213e,stroke:#81ecec,color:#e0e0e0
    style PARSE fill:#16213e,stroke:#81ecec,color:#e0e0e0
    style NER fill:#16213e,stroke:#fd79a8,color:#e0e0e0
    style SESSION fill:#16213e,stroke:#f8b739,color:#e0e0e0
    style UPSERT fill:#16213e,stroke:#f8b739,color:#e0e0e0
    style TX fill:#1a1a2e,stroke:#778da9,color:#e0e0e0
    style STEP2 fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style FAIL fill:#16213e,stroke:#e77f67,color:#e0e0e0
```

If RSS fails the pipeline logs `pipeline_rss_failed` and returns early — the brief step is skipped for that cycle.

---

### Step 2 — AI Brief Generation

**Called by:** `run_world_monitor_pipeline()` → `AIBriefService.regenerate_brief()` — only runs after RSS succeeds.

```mermaid
flowchart TD
    PIPE["run_world_monitor_pipeline()\nafter RSS success"]
    PIPE --> SESSION["async_session()\nopen DB session"]
    SESSION --> SERVICE["AIBriefService.regenerate_brief()"]
    SERVICE --> WORLD["SELECT world articles\nWORLD_SOURCES LIMIT 10"]
    SERVICE --> TECH["SELECT tech articles\nTECH_SOURCES LIMIT 10"]
    WORLD --> FMT_W["_format_articles\nworld text block"]
    TECH --> FMT_T["_format_articles\ntech text block"]
    FMT_W --> LLM_W["Ollama llama3.2\nWORLD_PROMPT"]
    FMT_T --> LLM_T["Ollama llama3.2\nTECH_PROMPT"]
    LLM_W --> PARSE_W["parse + validate\nBriefLLMOutput JSON"]
    LLM_T --> PARSE_T["parse + validate\nBriefLLMOutput JSON"]
    PARSE_W --> REPLACE["BriefRepository.replace\nDELETE old + INSERT new"]
    PARSE_T --> REPLACE
    REPLACE --> COMMIT["Commit — brief persisted"]

    style PIPE fill:#16213e,stroke:#e77f67,color:#e0e0e0
    style SESSION fill:#16213e,stroke:#f8b739,color:#e0e0e0
    style SERVICE fill:#16213e,stroke:#a29bfe,color:#e0e0e0
    style WORLD fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
    style TECH fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
    style FMT_W fill:#16213e,stroke:#81ecec,color:#e0e0e0
    style FMT_T fill:#16213e,stroke:#81ecec,color:#e0e0e0
    style LLM_W fill:#1a1a2e,stroke:#a29bfe,color:#e0e0e0
    style LLM_T fill:#1a1a2e,stroke:#a29bfe,color:#e0e0e0
    style PARSE_W fill:#16213e,stroke:#fd79a8,color:#e0e0e0
    style PARSE_T fill:#16213e,stroke:#fd79a8,color:#e0e0e0
    style REPLACE fill:#16213e,stroke:#f8b739,color:#e0e0e0
    style COMMIT fill:#16213e,stroke:#a29bfe,color:#e0e0e0
```

If brief generation fails the error is logged as `pipeline_brief_failed`. The scheduler is unaffected and will retry the full pipeline on the next interval.

---

## 4. Full Execution Sequence

End-to-end view of one 30-minute cycle.

```mermaid
sequenceDiagram
    participant APSched as APScheduler
    participant Pipeline as world_monitor_pipeline
    participant RSS as RSSService
    participant Geo as LocationExtractorService
    participant NewsRepo as NewsRepository
    participant DB as PostgreSQL
    participant Brief as AIBriefService
    participant LLM as Ollama llama3.2

    Note over APSched: HH:00 — interval fires
    APSched->>Pipeline: run_pipeline_job()
    Pipeline->>RSS: fetch_all_feeds()
    loop 10 sources (asyncio.gather)
        RSS->>RSS: _fetch_feed(source, url)
    end
    loop Each article
        RSS->>Geo: extract_best_location_from_text()
        Geo-->>RSS: location / None
    end
    RSS-->>Pipeline: list[NewsItem]
    Pipeline->>NewsRepo: replace_many_by_source(db, articles)
    NewsRepo->>DB: DELETE old rows for fetched sources
    NewsRepo->>DB: INSERT / UPSERT new article rows
    DB-->>Pipeline: articles_stored = N
    Note over Pipeline: log pipeline_rss_complete

    Pipeline->>Brief: regenerate_brief(db)
    Brief->>DB: SELECT world articles (LIMIT 10)
    DB-->>Brief: world article rows
    Brief->>DB: SELECT tech articles (LIMIT 10)
    DB-->>Brief: tech article rows
    Brief->>LLM: _generate_section(WORLD_PROMPT, world_text)
    LLM-->>Brief: world JSON + token usage
    Brief->>LLM: _generate_section(TECH_PROMPT, tech_text)
    LLM-->>Brief: tech JSON + token usage
    Brief->>DB: DELETE FROM briefs
    Brief->>DB: INSERT new brief row
    DB-->>Brief: persisted brief
    Note over Pipeline: log pipeline_brief_complete
    Note over Pipeline: log pipeline_finished
```

---

## 5. File Structure

```
backend/
├── main.py                              # lifespan calls start_scheduler() / shutdown_scheduler()
│
├── scheduler/
│   ├── __init__.py
│   ├── scheduler.py                     # AsyncIOScheduler instance, start/shutdown helpers
│   └── jobs.py                          # run_pipeline_job() — thin async wrapper
│
├── pipelines/
│   ├── __init__.py
│   └── world_monitor_pipeline.py        # sequential RSS → AI brief orchestration
│
└── app/
    └── services/
        ├── rss_service.py               # feed fetching + location enrichment
        └── ai_brief_service.py          # LLM brief generation
```

---

## 6. Docker Setup

The scheduler runs inside the single `fastapi` service. No additional containers are needed.

| Service | Workers | Scheduler |
|:--------|:--------|:----------|
| `fastapi` | 1 (`--workers 1`) | APScheduler starts in the FastAPI lifespan |

`--workers 1` is required. Multiple Uvicorn workers would each start their own scheduler instance, causing duplicate pipeline runs every interval.

---

## 7. Configuration

| Variable | File | Default | Purpose |
|:---------|:-----|:--------|:--------|
| `APP_OLLAMA_BASE_URL` | `env/.env.fastapi` | `http://ollama:11434` | Ollama endpoint used by AIBriefService |
| `APP_OLLAMA_MODEL` | `env/.env.fastapi` | `llama3.2` | LLM model for brief generation |
| `APP_OLLAMA_TIMEOUT` | `env/.env.fastapi` | `120` | Seconds before LLM call times out |

Interval duration is set directly in `scheduler/scheduler.py` (`minutes=30`).

---

## 8. On-Demand Execution

Both pipeline steps are also triggerable on demand via HTTP without waiting for the schedule:

| HTTP Endpoint | Equivalent step |
|:--------------|:----------------|
| `POST /api/news/ingest` | RSS fetch + store |
| `POST /api/briefs/regenerate` | AI brief generation |
