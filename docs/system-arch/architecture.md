# Architecture
## Level 1: System Context

Who uses the system and what external systems it depends on.

```mermaid
flowchart TB
    USER(["👤 User\nViews news digest, map\nand AI briefings"])

    subgraph WM["World Monitor Dashboard"]
        SYSTEM["World Monitor\nAggregates global news, visualises on a map,\nand generates AI-powered briefings"]
    end

    RSS["🌐 RSS Sources\nExternal news and data feeds"]
    OLLAMA["🤖 Ollama Server\nLocal LLM — summary generation"]
    PG[("🗄 PostgreSQL\nArticles, digests, briefings")]

    USER -->|"Uses"| SYSTEM
    SYSTEM -->|"Fetches feeds"| RSS
    SYSTEM -->|"Requests summaries"| OLLAMA
    SYSTEM <-->|"Reads / writes data"| PG

    style WM fill:#0d1b2a,stroke:#1b9aaa,stroke-width:2px,color:#e0e0e0
    style SYSTEM fill:#16213e,stroke:#1b9aaa,color:#e0e0e0
    style USER fill:#2d3436,stroke:#dfe6e9,color:#e0e0e0
    style RSS fill:#2d3436,stroke:#dfe6e9,color:#e0e0e0
    style OLLAMA fill:#1a1a2e,stroke:#a29bfe,color:#e0e0e0
    style PG fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
```

---

## Level 2: Containers

The two deployable units inside World Monitor and how they communicate with each other and external systems.

```mermaid
flowchart TB
    USER(["👤 User\nViews news digest, map\nand AI briefings"])

    subgraph WM["World Monitor"]
        FRONTEND["React Frontend\nReact · TypeScript · Vite\nSingle-page dashboard —\ndigest, map, briefings"]
        BACKEND["FastAPI Backend\nPython · FastAPI · APScheduler\nREST API + embedded scheduler\nrunning the pipeline every 30 min"]
    end

    RSS["🌐 RSS Sources\nExternal news feeds"]
    OLLAMA["🤖 Ollama Server\nllama3.2 · :11434"]
    PG[("🗄 PostgreSQL\nArticles · Briefs\n:5432")]

    USER -->|"HTTPS"| FRONTEND
    FRONTEND -->|"HTTP / JSON"| BACKEND
    BACKEND <-->|"SQL / asyncpg"| PG
    BACKEND -->|"HTTP — fetch feeds"| RSS
    BACKEND -->|"HTTP — LLM prompts"| OLLAMA

    style WM fill:#0d1b2a,stroke:#1b9aaa,stroke-width:2px,color:#e0e0e0
    style FRONTEND fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style BACKEND fill:#16213e,stroke:#1b9aaa,color:#e0e0e0
    style USER fill:#2d3436,stroke:#dfe6e9,color:#e0e0e0
    style RSS fill:#2d3436,stroke:#dfe6e9,color:#e0e0e0
    style OLLAMA fill:#1a1a2e,stroke:#a29bfe,color:#e0e0e0
    style PG fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
```

---

## Level 3: Components

Internal components of the FastAPI backend and their responsibilities.

```mermaid
flowchart TB
    subgraph FASTAPI["FastAPI Backend"]
        SCHED["APScheduler\nInterval job — every 30 min\nmax_instances=1 · coalesce=True"]
        PIPE["World Monitor Pipeline\nSequential orchestrator:\nRSS → AI Brief"]
        RSS_SVC["RSS Service\nFetch · Normalize\nspaCy NER · GeoPy geocoding"]
        BRIEF_SVC["AI Brief Service\nLangChain · llama3.2\nWorld Brief + Tech Brief"]
    end

    PG[("🗄 PostgreSQL\nArticles · Briefs")]
    OLLAMA["🤖 Ollama\nllama3.2"]
    FEEDS["🌐 RSS Sources"]

    SCHED -->|"triggers every 30 min"| PIPE
    PIPE -->|"step 1 — fetch & store"| RSS_SVC
    PIPE -->|"step 2 — generate briefs\nruns after RSS"| BRIEF_SVC
    RSS_SVC -->|"HTTP — fetch feeds"| FEEDS
    RSS_SVC -->|"upsert articles"| PG
    BRIEF_SVC -->|"read articles"| PG
    BRIEF_SVC -->|"LLM prompts"| OLLAMA
    OLLAMA -->|"structured JSON"| BRIEF_SVC
    BRIEF_SVC -->|"replace brief row"| PG

    style FASTAPI fill:#0d1b2a,stroke:#1b9aaa,stroke-width:2px,color:#e0e0e0
    style SCHED fill:#16213e,stroke:#1b9aaa,color:#e0e0e0
    style PIPE fill:#16213e,stroke:#e77f67,color:#e0e0e0
    style RSS_SVC fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style BRIEF_SVC fill:#16213e,stroke:#a29bfe,color:#e0e0e0
    style PG fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
    style OLLAMA fill:#1a1a2e,stroke:#a29bfe,color:#e0e0e0
    style FEEDS fill:#2d3436,stroke:#dfe6e9,color:#e0e0e0
```
## Service Interaction
React calls FastAPI for digest, map, and brief endpoints. Inside FastAPI, APScheduler fires the world monitor pipeline every 30 minutes — first fetching and storing RSS articles, then generating AI briefs via Ollama. All data is persisted to PostgreSQL.

## Data Flow
```mermaid
flowchart TD
  SCHED["APScheduler\nevery 30 min"] --> PIPE["World Monitor Pipeline"]
  RSS[RSS Sources] --> PIPE
  PIPE --> INGEST[RSS Service\nfetch + normalize]
  INGEST --> NORM[Deduplicate & Upsert]
  NORM --> DB[(PostgreSQL)]
  DB --> BRIEF[AI Brief Service]
  BRIEF --> OLLAMA[Ollama llama3.2]
  OLLAMA --> BRIEF
  BRIEF --> DB
  DB --> API[FastAPI REST API]
  API --> UI[React Dashboard]

  style SCHED fill:#16213e,stroke:#1b9aaa,color:#e0e0e0
  style PIPE fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style RSS fill:#2d3436,stroke:#dfe6e9,color:#e0e0e0
  style INGEST fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style NORM fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style DB fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
  style BRIEF fill:#16213e,stroke:#a29bfe,color:#e0e0e0
  style OLLAMA fill:#1a1a2e,stroke:#a29bfe,color:#e0e0e0
  style API fill:#16213e,stroke:#00d4aa,color:#e0e0e0
  style UI fill:#1a1a2e,stroke:#00d4aa,color:#e0e0e0
```
APScheduler triggers the pipeline every 30 minutes: RSS feeds are fetched, normalised, and upserted to PostgreSQL; then the AI Brief Service reads the freshest articles, calls Ollama llama3.2 for structured JSON output, and replaces the brief row. The React dashboard reads all data through the FastAPI REST API.

## Related Documents
- [Scheduled Tasks](../system-components/scheduled-tasks.md)
- [News RSS Pipeline](../system-components/news-pipeline.md)
- [Location Caching Strategy](../system-components/location-caching-strategy.md)
