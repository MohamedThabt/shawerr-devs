# News RSS Pipeline

## Purpose
This document describes only the RSS ingestion pipeline that fetches, normalizes, enriches, and prepares news items for persistence.

For endpoint orchestration (`GET /api/news` and `POST /api/news/ingest`), see [news-api-flow.md](news-api-flow.md).
For location geocode cache design and rationale, see [location-caching-strategy.md](location-caching-strategy.md).

## Pipeline Scope
- Trigger: ingestion path invokes `RSSService.fetch_all_feeds()`.
- Input: configured RSS feed URLs.
- Output: normalized `NewsItem` collection passed to `NewsRepository.replace_many_by_source(...)`.
- Storage target: `news` table described in [../system-arch/database.md](../system-arch/database.md).

## Runtime Pipeline
1. `RSSService` loads configured feed sources.
2. Feeds are fetched concurrently with `httpx`.
3. Raw feed payloads are parsed with `feedparser`.
4. Feed entries are normalized into internal `NewsItem` shape.
5. Location extraction enriches items with `location`, `lat`, `lon`, and `location_type` when available.
6. Service returns the merged `NewsItem` payload to the caller for repository persistence.

## Important Behavior
- Pipeline execution is synchronous in the current architecture.
- Failures are isolated per feed/item so successful items can still continue through the pipeline.
- Source identity is preserved so persistence can run source-scoped replacement.
- Existing news rows are treated as a cache snapshot. Refresh uses a single transaction for source-scoped delete+insert so changes are applied atomically.
- Replacement is intentionally source-scoped (not full-table) because some sources may fail during a fetch cycle; keeping untouched sources avoids dropping still-valid cached news.
- If pipeline output is empty, persistence layer skips delete/insert and existing cached rows remain.

## Flowchart
```mermaid
flowchart TD
  ingestTrigger["Ingest Trigger"]
  ingestTrigger --> fetchStage["Fetch RSS feeds concurrently"]
  fetchStage --> parseStage["Parse and normalize entries"]
  parseStage --> enrichStage["Enrich with location metadata"]
  enrichStage --> repoStage["Source-scoped replace in repository"]

  repoStage --> txBegin["Begin transaction"]
  txBegin --> deleteStage["Delete old rows for payload sources"]
  deleteStage --> insertStage["Insert refreshed rows"]
  insertStage --> txOk{"Write successful?"}
  txOk -- Yes --> txCommit["Commit"]
  txOk -- No --> txRollback["Rollback"]
  txCommit --> newsDb[("PostgreSQL news cache")]
  txRollback --> newsDb

  style ingestTrigger fill:#1b9aaa,stroke:#1b9aaa,color:#0d1b2a
  style fetchStage fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style parseStage fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style enrichStage fill:#16213e,stroke:#fd79a8,color:#e0e0e0
  style repoStage fill:#16213e,stroke:#f8b739,color:#e0e0e0
  style txBegin fill:#16213e,stroke:#778da9,color:#e0e0e0
  style deleteStage fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style insertStage fill:#16213e,stroke:#00d4aa,color:#e0e0e0
  style txOk fill:#1a1a2e,stroke:#778da9,color:#e0e0e0
  style txCommit fill:#16213e,stroke:#00d4aa,color:#e0e0e0
  style txRollback fill:#16213e,stroke:#e77f67,color:#e0e0e0
  style newsDb fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
```

## Flow Summary
- The ingest trigger starts a concurrent fetch across configured RSS sources.
- The pipeline parses feed entries and normalizes them into `NewsItem`.
- Location enrichment adds best-effort geo fields when available.
- Persistence replaces only payload sources inside one DB transaction.
- On any write failure, rollback preserves the previous cached state.

## Sequence Diagram
```mermaid
sequenceDiagram
  participant Trigger as IngestTrigger
  participant RSS as RSSService
  participant HTTP as httpx
  participant Parser as feedparser
  participant Geo as LocationExtractorService
  participant NER as spaCyNER
  participant Cache as GeocodeCacheJSON
  participant Nominatim as NominatimAPI
  participant Repo as NewsRepository
  participant DB as PostgreSQL

  Trigger->>RSS: fetch_all_feeds()
  loop Each configured source
    RSS->>HTTP: GET source feed URL
    alt HTTP request fails
      HTTP-->>RSS: error/timeout
      RSS-->>RSS: mark source as failed and continue
    else HTTP success
      HTTP-->>RSS: RSS XML payload
      RSS->>Parser: parse(response.text)
      Parser-->>RSS: feed.entries
      RSS-->>RSS: map top entries to NewsItem
    end
  end

  loop Each NewsItem (title + summary)
    RSS->>Geo: extract_best_location_from_text(text)
    Geo->>NER: extract GPE/LOC entities
    NER-->>Geo: candidate location names
    alt No candidate location
      Geo-->>RSS: None (keep article without location)
    else Candidate locations found
      loop Each candidate name
        Geo->>Cache: lookup normalized name
        alt Cache hit
          Cache-->>Geo: cached geocode result
        else Cache miss
          Geo->>Nominatim: geocode(name)
          Nominatim-->>Geo: lat/lon + addresstype or not found
          Geo->>Cache: save geocode result
        end
      end
      Geo-->>RSS: best ranked location (city > region > country)
    end
  end

  RSS-->>Trigger: merged NewsItem payload
  Trigger->>Repo: replace_many_by_source(db, items)
  Repo->>DB: BEGIN TRANSACTION
  Repo->>DB: DELETE by payload sources
  Repo->>DB: INSERT payload rows
  alt Insert fails or DB error
    Repo->>DB: ROLLBACK
    DB-->>Repo: old source rows preserved
  else All writes succeed
    Repo->>DB: COMMIT
  end
```
