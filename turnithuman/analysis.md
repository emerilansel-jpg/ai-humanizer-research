# Reverse Engineering: TurnItHuman.com

## Overview
- Platform: TurnItHuman.com (Owner: Indexsy / Jacky Chou)
- Frontend: Astro + Vanilla JS / Cloudflare Pages / CDN
- Backend API: REST + SSE + MCP endpoints (`https://turnithuman.com/v1`)
- Core Provider: Undetectable.ai API upstream (`provider: "undetectable"`)

## Pipeline Architecture
Revealed via OpenAPI 3.1 spec (`/v1/openapi.json`):

```
Input Text
   │
   ▼
[Stage 0: s0_normalize]             -> Markdown & unicode cleanup, whitespace normalization
   │
   ▼
[Stage 1: s1_mechanical_fix]         -> Deterministic regex replacements (em-dashes, AI transition clichés)
   │
   ▼
[Stage 2: s2_llm_rewrite]            -> Prompted LLM pass (academic_essay, article_blog, marketing, etc.)
   │
   ▼
[Stage 3: s3_slop_gate]              -> Heuristic AI vocabulary filter (re-checks for banned AI slop)
   │
   ▼
[Stage 4: s4_undetectable_humanize]  -> Upstream call to Undetectable.ai API
   │
   ▼
[Stage 5: s5_detector_check]         -> Multi-detector aggregator check
   │                                   (GPTZero, CopyLeaks, ZeroGPT, Sapling, CrossPlag, ContentAtScale, Writer)
   ▼
[Stage 6: s6_fidelity_check]         -> Embedding cosine similarity (document & paragraph level)
   │                                   Detects dropped numbers, quotes, code, entities, citations
   ▼
[Stage 7: s7_finalize]               -> Style metrics calculation (burstiness, gunning_fog, type_token_ratio)
```

## Key API Endpoints
- `POST /v1/jobs`: Create humanize job (supports `plain` & `markdown`)
- `GET /v1/jobs/{id}`: Poll job status & results
- `GET /v1/jobs/{id}/events`: SSE stream for progress events
- `POST /v1/jobs/{id}/rehumanize`: Retry/re-run job with different seed
- `POST /v1/detect`: Multi-detector standalone scan
- `POST /v1/public/free-detect`: Free tier detector check
- `POST /v1/mcp`: MCP tool bridge for Claude Desktop / Agent integrations

## Presets & Configuration
- Presets: `academic_essay`, `academic_report`, `article_blog`, `marketing`, `business`, `story`, `cover_letter`, `legal`, `general`
- Readability Targets: `High School`, `University`, `Doctorate`, `Journalist`, `Marketing`
- Strengths: `Quality`, `Balanced`, `More Human`
- Strategies: `humanize_only`, `style_replicate_humanized`
