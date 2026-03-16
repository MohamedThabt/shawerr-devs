# System Overview

## Idea
Build a live intelligence dashboard inspired by World Monitor that combines global news, a geographic event view, and AI-generated briefs in one interface.

## Goal And Purpose
- Create a single situational awareness product for tracking fast-moving global events.
- Reduce time spent switching between separate news, map, and analysis tools.
- Turn raw headlines into a readable dashboard and one concise AI-generated brief.
- Build a production-style MVP with React, FastAPI, a persistent database, and server-side Ollama.

## Users
- OSINT researchers
- journalists and analysts
- founders, investors, or operators tracking global risk

## Value Proposition
- One screen for monitoring headlines, locations, and summary context.
- Faster decision-making through grouped feeds and short synthesized briefings.
- A simple architecture that can later expand into more feeds, variants, and map layers.

## Core Output
- Aggregated headlines grouped by category or source
- One clear interactive map with event markers or regional layers
- A short AI brief generated from recent headlines through Ollama

## Main Components
- React dashboard for panels, filters, and map view
- FastAPI service for feed aggregation, brief generation, and map endpoints
- Database for feed metadata, ingested headlines, cached digests, and briefs
- Ollama service for summarization and world brief generation

## Main Workflow
- RSS feeds are fetched and normalized by the backend.
- Headlines are stored, grouped, and exposed through digest APIs.
- Relevant items are attached to map coordinates or regional markers.
- Recent headlines are passed to Ollama to generate a World Brief.
- React renders all outputs in a unified dashboard layout.

## MVP Scope
- 5 to 10 trusted RSS feeds across world, conflict, and economy categories
- Single map mode with headline-linked event points
- One brief type: World Brief
- Manual or scheduled refresh every 15 to 30 minutes

## Success Criteria
- User can open one live URL and see fresh headlines, a working map, and an AI brief.
- Backend persists data and serves all three areas through API endpoints.
- Ollama runs on the server and is called from FastAPI, not from the browser.
