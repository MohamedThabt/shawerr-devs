# News API Flow

## Purpose
This document describes endpoint orchestration for reading and ingesting news through the API layer.

For RSS internals (fetch, parse, normalize, enrich), see [news-pipeline.md](news-pipeline.md).
For persistence structure, see [../system-arch/database.md](../system-arch/database.md).

## Endpoints
- `GET /api/news`: read latest persisted news from the `news` cache table.
- `POST /api/news/ingest`: run ingest pipeline and return latest persisted news.

## Runtime Flows

### Read Flow (`GET /api/news`)
1. Client calls `GET /api/news`.
2. `routes/api.py` delegates to `NewsController.get_news(db)`.
3. Controller reads rows through `NewsRepository.list_latest(...)`.
4. Repository queries `news` ordered by `published_at`.
5. Controller maps rows to `NewsItem` and returns `NewsResponse`.

### Ingest Flow (`POST /api/news/ingest`)
1. Client calls `POST /api/news/ingest`.
2. `routes/api.py` delegates to `NewsController.ingest_news(db)`.
3. Controller calls `RSSService.fetch_all_feeds()`.
4. RSS pipeline returns normalized `NewsItem` payload.
5. Controller calls `NewsRepository.replace_many_by_source(...)`.
6. Repository opens one DB transaction and performs source-scoped `DELETE` + `INSERT`.
7. If any write fails, transaction rolls back so old rows stay intact.
8. If payload is empty, repository skips write operations.
9. Controller reads latest rows via `NewsRepository.list_latest(...)`.
10. Controller returns `NewsResponse`.

## Guarantees
- `GET /api/news` never triggers live RSS fetching.
- `POST /api/news/ingest` is currently synchronous.
- Empty ingest payload does not delete existing rows.
- Ingest replacement is source-scoped, not full-table replacement.
- Source-scoped delete+insert runs in one transaction (all-or-nothing).

## Flowchart
```mermaid
flowchart TD
  client["Client"]
  client --> getNews["GET /api/news"]
  getNews --> readRoute["FastAPI Route"]
  readRoute --> readController["NewsController.get_news"]
  readController --> readRepo["NewsRepository.list_latest"]
  readRepo --> db[("PostgreSQL news table")]
  db --> readController
  readController --> readResponse["NewsResponse"]

  client --> ingestNews["POST /api/news/ingest"]
  ingestNews --> ingestRoute["FastAPI Route"]
  ingestRoute --> ingestController["NewsController.ingest_news"]
  ingestController --> rssService["RSSService.fetch_all_feeds"]
  rssService --> writeRepo["NewsRepository.replace_many_by_source"]
  writeRepo --> db
  ingestController --> rereadRepo["NewsRepository.list_latest"]
  rereadRepo --> db
  ingestController --> ingestResponse["NewsResponse"]

  style client fill:#1b9aaa,stroke:#1b9aaa,color:#0d1b2a
  style getNews fill:#16213e,stroke:#00d4aa,color:#e0e0e0
  style readRoute fill:#16213e,stroke:#778da9,color:#e0e0e0
  style readController fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style readRepo fill:#16213e,stroke:#f8b739,color:#e0e0e0
  style db fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
  style readResponse fill:#1b9aaa,stroke:#1b9aaa,color:#0d1b2a
  style ingestNews fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style ingestRoute fill:#16213e,stroke:#778da9,color:#e0e0e0
  style ingestController fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style rssService fill:#16213e,stroke:#00d4aa,color:#e0e0e0
  style writeRepo fill:#16213e,stroke:#f8b739,color:#e0e0e0
  style rereadRepo fill:#16213e,stroke:#f8b739,color:#e0e0e0
  style ingestResponse fill:#1b9aaa,stroke:#1b9aaa,color:#0d1b2a
```

## Sequence Diagram
```mermaid
sequenceDiagram
  actor Client
  participant API as FastAPIRoute
  participant Controller as NewsController
  participant Repo as NewsRepository
  participant RSS as RSSService
  participant DB as PostgreSQL

  Client->>API: GET /api/news
  API->>Controller: get_news(db)
  Controller->>Repo: list_latest(db, limit)
  Repo->>DB: SELECT news ORDER BY published_at DESC
  DB-->>Repo: rows
  Repo-->>Controller: mapped items
  Controller-->>API: NewsResponse
  API-->>Client: JSON response

  Client->>API: POST /api/news/ingest
  API->>Controller: ingest_news(db)
  Controller->>RSS: fetch_all_feeds()
  RSS-->>Controller: NewsItem payload
  Controller->>Repo: replace_many_by_source(db, items)
  Repo->>DB: BEGIN TRANSACTION
  Repo->>DB: DELETE WHERE source IN payload sources
  Repo->>DB: INSERT payload rows
  alt Insert fails or DB error
    Repo->>DB: ROLLBACK
    DB-->>Repo: old rows preserved
  else All writes succeed
    Repo->>DB: COMMIT
  end
  Controller->>Repo: list_latest(db, limit)
  Repo->>DB: SELECT latest rows
  Controller-->>API: NewsResponse
  API-->>Client: JSON response
```
