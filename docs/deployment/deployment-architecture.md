# Deployment Architecture

## Purpose
This document describes how World Monitor is deployed on a VPS and managed through Dokploy, including service boundaries, domains, and runtime networking.

## Deployment Model
The production setup uses one VPS with Dokploy managing two services:

- `frontend` service: React dashboard
- `backend` service: FastAPI, Nginx reverse proxy, Ollama, and PostgreSQL (managed from the backend stack)

## Public Domains

| Domain | Service | Role |
|:-------|:--------|:-----|
| `https://worldmonitor.sirthabet.dev/` | Frontend service | Public dashboard UI |
| `https://api-worldmonitor.sirthabet.dev/` | Backend service | Public API entry point via Nginx |

## Container Topology

```mermaid
flowchart TB
    USER(["User Browser"])

    subgraph VPS["VPS (Dokploy Managed)"]
        subgraph FRONT["Frontend Service"]
            REACT["React + Vite static app"]
        end

        subgraph BACK["Backend Service"]
            NGINX["Nginx\nPublic reverse proxy"]
            FASTAPI["FastAPI app\nAPI + scheduler"]
            OLLAMA["Ollama\nllama3.2"]
            POSTGRES[("PostgreSQL")]
        end
    end

    USER -->|"HTTPS\nworldmonitor.sirthabet.dev"| REACT
    USER -->|"HTTPS\napi-worldmonitor.sirthabet.dev"| NGINX
    NGINX -->|"proxy /api"| FASTAPI
    FASTAPI -->|"SQL"| POSTGRES
    FASTAPI -->|"LLM HTTP"| OLLAMA

    style VPS fill:#0d1b2a,stroke:#1b9aaa,stroke-width:2px,color:#e0e0e0
    style FRONT fill:#16213e,stroke:#00d4aa,stroke-width:2px,color:#e0e0e0
    style BACK fill:#16213e,stroke:#1b9aaa,stroke-width:2px,color:#e0e0e0
    style REACT fill:#1a1a2e,stroke:#00d4aa,color:#e0e0e0
    style NGINX fill:#1a1a2e,stroke:#778da9,color:#e0e0e0
    style FASTAPI fill:#1a1a2e,stroke:#1b9aaa,color:#e0e0e0
    style OLLAMA fill:#1a1a2e,stroke:#a29bfe,color:#e0e0e0
    style POSTGRES fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
```

## Runtime Notes
- The backend Docker stack is defined in `backend/docker-compose.yml`.
- Nginx is the public edge inside the backend stack and proxies requests to FastAPI.
- FastAPI runs API routes and background scheduling for the RSS + AI brief pipeline.
- FastAPI connects to PostgreSQL for persistence and Ollama for local LLM inference.

## Sensitive URLs in Production
When `APP_APP_ENV=production`, FastAPI **disables** interactive docs and the OpenAPI schema to avoid exposing API structure and internals:
- `/docs` (Swagger UI) — **disabled**
- `/redoc` (ReDoc) — **disabled**
- `/openapi.json` — **disabled**

Set `APP_APP_ENV=production` in the backend service environment in Dokploy (or in `docker-compose` env for production). In development, leave it as `development` (default) to keep docs available at e.g. `http://localhost:8080/docs`.

## Dokploy Responsibilities
- Build and run each service from its repository path.
- Attach each service to its assigned domain.
- Keep service health and restart policy active.
- Provide deployment history and logs per service.

## Related Docs
- [Architecture](../system-arch/architecture.md)
- [Scheduled Tasks](../system-components/scheduled-tasks.md)
