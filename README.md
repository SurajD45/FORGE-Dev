# FORGE — Agentic Dev Studio

> Autonomous multi-agent SDLC pipeline that converts a vague project idea into a validated, reviewed, runnable FastAPI backend — with a React web UI coming in V3.

---

## Table of Contents

1. [What FORGE Is](#what-forge-is)
2. [Core Philosophy](#core-philosophy)
3. [Current State — V1 Complete](#current-state--v1-complete)
4. [Pipeline Architecture](#pipeline-architecture)
5. [Agent Breakdown](#agent-breakdown)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [What FORGE Produces](#what-forge-produces)
9. [How to Run](#how-to-run)
10. [API Key Rotation](#api-key-rotation)
11. [Decision Rules (Deterministic Layer)](#decision-rules-deterministic-layer)
12. [Failure Behaviour](#failure-behaviour)
13. [Reviewer Agent Checks](#reviewer-agent-checks)
14. [Supported Stack (V1 — Locked)](#supported-stack-v1--locked)
15. [Environment Variables](#environment-variables)
16. [Contributing](#contributing)
17. [V2 — Web Platform (In Progress)](#v2--web-platform-in-progress)
18. [V3 — React Frontend Plan](#v3--react-frontend-plan)

---

## What FORGE Is

FORGE is a multi-agent system built with CrewAI and Groq. It replaces the chaotic "paste your idea into ChatGPT and get random code" workflow with a structured, deterministic pipeline that enforces real engineering discipline.

You describe a backend project idea in plain English. FORGE conducts a discovery interview, designs the architecture, writes every source file, and produces a review report — all without you writing a single line of code.

---

## Core Philosophy

```
LLM handles reasoning     →  understanding natural language, generating code
Deterministic code handles control  →  architecture decisions, schema validation, file writing
These two responsibilities are NEVER mixed.
```

Every LLM output is validated before it can affect the system:
- TRD output → validated against `trd_schema.json`
- ARCH output → validated against `arch_schema.json`
- Code output → validated against Python AST before any file is written

---

## Current State — V1 Complete

| Component | Status | Notes |
|---|---|---|
| Explorer Agent | ✅ Complete | Iterative discovery, max 2 rounds, force extraction on timeout |
| Architect Agent | ✅ Complete | LLM designs file structure, deterministic layer enforces mandatory files |
| Developer Agent | ✅ Complete | One LLM call per file, dependency-ordered, AST-validated, 2 retries |
| Reviewer Agent | ✅ Complete | Layer 1 deterministic AST checks + Layer 2 LLM semantic review |
| Key Rotation | ✅ Complete | Supports 5 Groq API keys, auto-rotates on rate limit |
| Docker Support | ✅ Complete | Full containerisation, volumes mounted for output |
| Schema Validation | ✅ Complete | JSON Schema enforcement on TRD and ARCH |
| README Generation | ✅ Complete | Project-specific README generated per run |
| Review Report | ✅ Complete | REVIEW_REPORT.md with Layer 1 + Layer 2 results |

---

## Pipeline Architecture

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────┐
│  STAGE 1: Explorer Agent                │
│  • Up to 2 rounds of discovery Q&A      │
│  • Force-extracts intent at MAX_ROUNDS  │
│  • Deterministic corrections applied    │
│  → TRD.json + TRD.md                   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  STAGE 2: Architect Agent               │
│  • LLM designs file structure           │
│  • Deterministic layer injects:         │
│    main.py, database.py, models.py,     │
│    config.py, auth.py (if jwt)          │
│  • Strips non-code files LLM adds       │
│  → ARCH.json + ARCH.md                 │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  STAGE 3: Developer Agent               │
│  • Generates files in dependency order  │
│  • config.py always generated first     │
│  • Each file injected with context of   │
│    all previously generated files       │
│  • AST validation per file, 2 retries   │
│  • Atomic write — no partial output     │
│  • README.md generated at the end       │
│  → All .py source files + README.md    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  STAGE 4: Reviewer Agent                │
│  Layer 1 — Deterministic AST checks     │
│  Layer 2 — LLM semantic review          │
│  → REVIEW_REPORT.md                    │
└─────────────────────────────────────────┘
```

---

## Agent Breakdown

### Stage 1 — Explorer Agent (`agents/explorer.py`)

**Model:** `groq/llama-3.3-70b-versatile`

Responsible for converting a vague user prompt into a structured TRD-ready intent object.

- Runs up to `MAX_ROUNDS = 2` discovery rounds
- Returns either `type: "questions"` (asks clarifying questions with options) or `type: "intent"` (ready to proceed)
- On `MAX_ROUNDS` exhaustion, calls `force_intent_extraction()` — uses all collected history to force an intent
- All intent fields validated and defaulted in `_validate_intent_fields()`
- Deterministic corrections applied in orchestrator (`apply_deterministic_corrections`) — auth keywords in features force `needs_auth = True`

**Intent fields produced:**

| Field | Type | Default |
|---|---|---|
| `project_name` | string (hyphenated) | `unnamed-project` |
| `features` | list of strings (max 6) | `[]` |
| `scale` | `"low"` or `"high"` | `"low"` |
| `needs_auth` | bool | `false` |
| `constraints` | list | `[]` |
| `out_of_scope` | list | `[]` |

---

### Stage 2 — Architect Agent (`agents/architect.py`)

**Model:** `groq/llama-3.3-70b-versatile`

Designs the file structure from the TRD. The LLM's output is intentionally incomplete — the deterministic `build_arch()` function in `utils/arch_builder.py` injects mandatory files the LLM cannot omit or modify.

**Mandatory file injection rules:**

| Condition | Files Injected |
|---|---|
| Always | `main.py`, `database.py`, `models.py`, `config.py` |
| `auth == "jwt"` | `auth.py` |
| `database == "postgresql"` | `alembic.ini` (in responsibilities only, not file_list) |

Non-code files the LLM hallucinates into `file_list` (e.g. `requirements.txt`, `.env`) are stripped deterministically.

---

### Stage 3 — Developer Agent (`agents/developer.py`)

**Model:** `groq/llama-3.3-70b-versatile`

Generates Python source code one file at a time. Each call injects:
- Full TRD and ARCH as context
- All previously generated files (for import name matching)
- File-specific rules (15+ rules per file type: config.py, database.py, models.py, auth.py, main.py, routes files)
- Previous AST error message on retry

**Generation order:**
1. `config.py` (bootstrap, always first)
2. Files in `dependency_order` from ARCH
3. Any remaining files in `file_list`

Atomic write: no files are written to disk until every file has passed AST validation.

**README generation:** After all source files are written, a separate LLM call generates a project-specific README using all generated code as context.

---

### Stage 4 — Reviewer Agent (`agents/reviewer.py`)

**Model:** `groq/moonshotai/kimi-k2-instruct` (Layer 2)

Two-layer review:

**Layer 1 — Deterministic (`utils/ast_checker.py`), 7 checks:**

| Check | What It Catches |
|---|---|
| Import resolution | Imports from modules not in `file_list` |
| Package prefix | `from project_name.module import` — flat imports required |
| Base import | `models.py` must import `Base` from `database` |
| SessionLocal type hint | Must use `Session` from `sqlalchemy.orm`, never `SessionLocal` |
| get_db direct call | Must use `Depends(get_db)`, never `get_db()` directly |
| Router mounting | All `*_routes.py` files must be imported and included in `main.py` |
| Depends outside route | `Depends()` only valid in route handlers and known dependency functions |

**Layer 2 — LLM Semantic Review (kimi-k2-instruct), 8 checks:**

| Check | What It Catches |
|---|---|
| Pydantic/ORM alignment | Response models must match ORM model fields exactly |
| Auth coverage | JWT applied to all routes that require protection |
| Feature coverage | All TRD features have at least one endpoint |
| Password hashing | passlib used before storing; never plain text |
| Ownership verification | update/delete routes verify `resource.owner_id == current_user.id` |
| HTTP status codes | 404/403/400/401 used correctly |
| Circular imports | Import chain risks flagged |
| Table creation | `Base.metadata.create_all()` called on startup in `main.py` |

---

## Tech Stack

| Component | Technology | Version |
|---|---|---|
| Agent Framework | CrewAI | 0.119.0 |
| LLM Provider | Groq | ≥0.29.0 |
| Primary Model | llama-3.3-70b-versatile | — |
| Review Model | moonshotai/kimi-k2-instruct | — |
| Language | Python | 3.11 |
| Schema Validation | jsonschema | 4.23.0 |
| AST Validation | Python `ast` module (stdlib) | — |
| Environment | python-dotenv | 1.1.0 |
| LangChain integration | langchain-groq | 0.3.5 |
| Containerisation | Docker + docker-compose | — |

---

## Project Structure

```
forge-p1/
├── main.py                        # Entry point — 3 lines, calls orchestrator
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
│
├── .env.example                   # Copy to .env, fill in API keys
├── .gitignore
├── .dockerignore
│
├── pipeline/
│   ├── __init__.py
│   └── orchestrator.py            # Controls all 4 stages, rate limit handling
│
├── agents/
│   ├── __init__.py
│   ├── explorer.py                # Stage 1 — discovery interview → intent
│   ├── architect.py               # Stage 2 — file structure design
│   ├── developer.py               # Stage 3 — file-by-file code generation
│   └── reviewer.py                # Stage 4 — LLM semantic review (Layer 2)
│
├── schemas/
│   ├── trd_schema.json            # Frozen TRD contract (JSON Schema Draft-07)
│   └── arch_schema.json           # Frozen ARCH contract (JSON Schema Draft-07)
│
├── utils/
│   ├── __init__.py
│   ├── trd_builder.py             # Deterministic TRD construction + Markdown export
│   ├── arch_builder.py            # Deterministic ARCH builder, mandatory file injection
│   ├── schema_validator.py        # TRD + ARCH JSON Schema validation
│   ├── ast_validator.py           # Python AST syntax check per file
│   ├── ast_checker.py             # Layer 1 structural checks (7 checks)
│   ├── dev_builder.py             # Atomic file writer + cleanup on failure
│   ├── review_builder.py          # REVIEW_REPORT.md generator
│   ├── file_utils.py              # Shared read/write helpers
│   └── llm_client.py              # CrewAI-based LLM caller with key rotation
│
└── output/                        # All generated artifacts (git-ignored)
    ├── TRD.json
    ├── TRD.md
    ├── ARCH.json
    ├── ARCH.md
    └── generated/
        └── {project_name}/
            ├── config.py
            ├── database.py
            ├── models.py
            ├── auth.py            # only if jwt
            ├── routes.py          # or *_routes.py per resource
            ├── main.py
            ├── README.md
            └── REVIEW_REPORT.md
```

---

## What FORGE Produces

From a single project description, FORGE writes to `output/`:

| Artifact | Description |
|---|---|
| `TRD.json` | Machine-readable Technical Requirements Document |
| `TRD.md` | Human-readable TRD for sharing/review |
| `ARCH.json` | Machine-readable Architecture Document |
| `ARCH.md` | Human-readable ARCH with file tree and dependency order |
| `generated/{name}/*.py` | All Python source files, AST-validated |
| `generated/{name}/README.md` | Project-specific setup and API documentation |
| `generated/{name}/REVIEW_REPORT.md` | Layer 1 + Layer 2 review results |

---

## How to Run

### Option A: Docker (Recommended)

```bash
git clone https://github.com/SurajD45/forge-p1.git
cd forge-p1

cp .env.example .env
# Add your GROQ_API_KEY to .env

docker compose build
docker compose run forge
```

Generated files appear in `output/generated/{project_name}/` on your local machine via the mounted volume.

### Option B: Local Python

```bash
git clone https://github.com/SurajD45/forge-p1.git
cd forge-p1

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Add your GROQ_API_KEY

python main.py
```

---

## API Key Rotation

FORGE supports up to 5 Groq API keys. When a key hits its rate limit, FORGE automatically tries the next one.

```env
GROQ_API_KEY=your-primary-key
GROQ_API_KEY_2=second-key
GROQ_API_KEY_3=third-key
GROQ_API_KEY_4=fourth-key
GROQ_API_KEY_5=fifth-key
```

Key rotation is handled in `utils/llm_client.py`. The orchestrator also has a secondary `_call_with_rate_limit_retry()` wrapper that waits and retries up to 3 times (30s, 45s, 60s) per file before escalating.

---

## Decision Rules (Deterministic Layer)

These decisions are never made by the LLM. They are hardcoded in `utils/trd_builder.py` and `utils/arch_builder.py`.

| Signal | Decision |
|---|---|
| `scale == "high"` | `database = postgresql` |
| `scale == "low"` (default) | `database = sqlite` |
| `needs_auth == true` | `auth = jwt` |
| `needs_auth == false` (default) | `auth = none` |
| Auth-related keywords in features | `needs_auth` forced to `true` |
| `auth == "jwt"` | `auth.py` injected into `file_list` |
| `database == "postgresql"` | `alembic.ini` added to responsibilities |

Auth signal keywords: `user`, `account`, `login`, `profile`, `member`, `role`, `permission`

---

## Failure Behaviour

FORGE fails loudly. There are no silent failures.

| Failure | Behaviour |
|---|---|
| No user input | `sys.exit(1)` immediately |
| LLM returns invalid JSON | Pipeline halted, raw output printed |
| TRD schema validation failure | Pipeline halted |
| ARCH schema validation failure | Pipeline halted |
| AST validation failure | Retry up to 2 times with error injected into next prompt |
| AST validation still failing after retries | Cleanup partial output, `sys.exit(1)` |
| Rate limit on all keys | Final `RateLimitError` raised and shown |
| `MAX_ROUNDS` hit in Explorer | `force_intent_extraction()` called, pipeline continues |
| Explorer returns error dict | Pipeline halted |
| Reviewer LLM failure | Non-critical, logged, empty Layer 2 result used |
| README generation failure | Non-critical, logged, pipeline continues |

---

## Reviewer Agent Checks

See [Agent Breakdown — Stage 4](#stage-4--reviewer-agent-agentsreviewerpy) for the full check list.

Layer 1 checks are always run. Layer 2 is non-blocking — if the LLM review call fails, the pipeline completes and the REVIEW_REPORT notes the failure.

---

## Supported Stack (V1 — Locked)

| Component | Options |
|---|---|
| Framework | FastAPI only |
| Database | SQLite or PostgreSQL |
| Auth | JWT or none |
| Project type | API backend only |
| Language | Python 3.11 only |

Anything outside this list is explicitly rejected at TRD schema validation.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Primary Groq API key from console.groq.com |
| `GROQ_API_KEY_2` through `_5` | No | Additional keys for rotation |
| `CREWAI_DISABLE_TELEMETRY` | Yes | Set to `true` — disables CrewAI telemetry |
| `OTEL_SDK_DISABLED` | Yes | Set to `true` — disables OpenTelemetry |

---

## Contributing

### Rules

1. Never push directly to `main` — all work via Pull Requests
2. One feature per branch
3. Test with at least 3 different project prompts before merging
4. Do not start the next agent until the current one is stable
5. Never mix LLM logic and deterministic logic in the same function

### Branch Naming

| Type | Format | Example |
|---|---|---|
| Feature | `feat/description` | `feat/react-frontend` |
| Bug fix | `fix/description` | `fix/password-hashing` |
| Refactor | `refactor/description` | `refactor/llm-client` |
| V3 work | `v3/description` | `v3/pipeline-api` |

### Workflow

```bash
git checkout main && git pull origin main
git checkout -b feat/your-feature
# make changes, test with python main.py
git add . && git commit -m "feat: description"
git push origin feat/your-feature
# open Pull Request into main
```

---

## V2 — Web Platform (In Progress)

V2 transforms FORGE from a local CLI tool into a hosted multi-user web service.

| Component | Plan | Status |
|---|---|---|
| API layer | FastAPI — FORGE exposes itself as an API | Planned |
| Job queue | Celery + Redis — pipeline runs are async jobs | Planned |
| Storage | S3 or GCS — generated artifact storage per user | Planned |
| Auth | User accounts with API key management | Planned |
| Deployment | Docker on VPS or cloud (Railway, Render, or EC2) | Planned |

The V2 API will expose these endpoints at minimum:

```
POST /pipeline/run     — submit a project description, returns job_id
GET  /pipeline/{id}    — poll job status and stream log output
GET  /artifacts/{id}   — download generated project files as .zip
POST /auth/register    — create user account
POST /auth/token       — login
```

---

## V3 — React Frontend Plan

V3 builds a production React web UI on top of the V2 API. This is the public-facing product layer.

### Target Users

Solo developers and small teams who want a guided, structured way to scaffold FastAPI backends without touching a CLI.

---

### Architecture

```
┌──────────────────────────────────────────────────────┐
│                  React Frontend (V3)                 │
│  Vite + React 18 + TypeScript + TailwindCSS          │
│  React Router v6 — SPA with protected routes         │
│  React Query (TanStack) — API state management       │
│  Zustand — lightweight global state                  │
└──────────────────┬───────────────────────────────────┘
                   │ HTTPS / REST + SSE
┌──────────────────▼───────────────────────────────────┐
│              FORGE V2 FastAPI Backend                │
└──────────────────────────────────────────────────────┘
```

---

### Tech Stack (V3 — Locked Decisions)

| Component | Choice | Reason |
|---|---|---|
| Framework | React 18 | Industry standard, ecosystem depth |
| Build tool | Vite | Fast HMR, minimal config |
| Language | TypeScript | Type safety across API contract |
| Styling | TailwindCSS | Utility-first, fast iteration |
| Routing | React Router v6 | SPA with protected routes |
| Server state | TanStack Query (React Query) | Async data fetching, caching, polling |
| Global state | Zustand | Lightweight, no boilerplate |
| Forms | React Hook Form + Zod | Validated forms with schema-driven types |
| HTTP client | Axios with interceptors | Auth header injection, error handling |
| Real-time | Server-Sent Events (SSE) | Stream pipeline log output live |
| Linting | ESLint + Prettier | Enforced from day 1 |
| Testing | Vitest + React Testing Library | Co-located unit tests |

---

### Pages and Routes

```
/                          Landing page — pitch, CTA, example output
/auth/login                Login form
/auth/register             Registration form
/dashboard                 [Protected] List of past pipeline runs
/run/new                   [Protected] Start a new pipeline run
/run/:id                   [Protected] Live pipeline view (SSE streaming)
/run/:id/artifacts         [Protected] Download/view generated files
/settings                  [Protected] API key management, account settings
```

---

### Component Architecture

```
src/
├── main.tsx                     # Vite entry point
├── App.tsx                      # Router setup, query client provider
│
├── api/
│   ├── client.ts                # Axios instance, interceptors, token injection
│   ├── pipeline.ts              # Pipeline API calls (run, status, artifacts)
│   └── auth.ts                  # Auth API calls (login, register, me)
│
├── hooks/
│   ├── usePipelineRun.ts        # TanStack Query: submit + poll run status
│   ├── useArtifacts.ts          # TanStack Query: fetch artifact list
│   └── useAuth.ts               # Zustand: current user, login, logout
│
├── pages/
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── NewRun.tsx               # The core UX — describe project, submit
│   ├── RunView.tsx              # Live log stream + stage progress
│   └── Artifacts.tsx           # File tree viewer + download
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx         # Nav + sidebar wrapper for protected pages
│   │   └── ProtectedRoute.tsx   # Auth guard component
│   ├── pipeline/
│   │   ├── StageIndicator.tsx   # Visual 4-stage progress (Explorer → Reviewer)
│   │   ├── LogStream.tsx        # SSE-powered live log terminal
│   │   ├── TRDPreview.tsx       # Read-only TRD.json viewer
│   │   ├── ArchPreview.tsx      # ARCH file tree visualiser
│   │   └── ReviewReport.tsx     # Rendered REVIEW_REPORT.md
│   ├── artifacts/
│   │   ├── FileTree.tsx         # Generated project file tree
│   │   ├── CodeViewer.tsx       # Syntax-highlighted file viewer
│   │   └── DownloadButton.tsx   # Zip download trigger
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Badge.tsx            # Pass / Fail / Warn status badges
│       └── Modal.tsx
│
├── store/
│   └── auth.ts                  # Zustand store: token, user, setUser, logout
│
├── types/
│   ├── pipeline.ts              # PipelineRun, PipelineStatus, TRD, ARCH types
│   └── auth.ts                  # User, LoginRequest, RegisterRequest types
│
└── utils/
    ├── sse.ts                   # SSE connection helper for log streaming
    └── format.ts                # Date, status, severity formatters
```

---

### Key UX Flows

#### 1. New Pipeline Run (`/run/new`)

```
User fills form:
  - Project description (textarea)
  - Optional: override scale (low / high)
  - Optional: override auth (yes / no)

Submit → POST /pipeline/run
         ↓
Redirect to /run/:id
```

#### 2. Live Pipeline View (`/run/:id`)

```
StageIndicator shows 4 stages:
  [Explorer] → [Architect] → [Developer] → [Reviewer]
  Each stage glows when active, ticks when complete.

LogStream component:
  Opens SSE connection to GET /pipeline/:id/logs
  Streams log lines in real-time — looks like a terminal

When complete:
  TRD Preview panel appears
  ARCH Preview panel appears
  "View Artifacts" CTA button activates
```

#### 3. Artifacts (`/run/:id/artifacts`)

```
FileTree: shows generated project file list
Click a file → CodeViewer opens with syntax highlighting
ReviewReport: rendered Markdown with Pass/Fail/Warn badges
DownloadButton: fetches zip and triggers browser download
```

---

### State Management Strategy

```
TanStack Query  — all server state (pipeline runs, artifacts, user data)
Zustand         — auth state only (token, current user)
Local state     — UI-only (modals, accordion open/close, form state)

No Redux. No Context for server state. No prop drilling.
```

---

### SSE (Live Log Streaming)

The V2 backend will expose:

```
GET /pipeline/:id/logs     — SSE endpoint, streams log lines as events
```

The React frontend will connect using `EventSource`:

```typescript
// utils/sse.ts
export function connectLogStream(runId: string, onLine: (line: string) => void) {
  const es = new EventSource(`/api/pipeline/${runId}/logs`, {
    withCredentials: true
  });
  es.onmessage = (e) => onLine(e.data);
  es.onerror = () => es.close();
  return () => es.close(); // cleanup function
}
```

`LogStream.tsx` calls this in a `useEffect`, buffers lines into local state, and auto-scrolls a `<pre>` element to the bottom.

---

### API Contract (V3 Depends On)

V3 is blocked on V2 exposing these endpoints with correct types:

```typescript
// types/pipeline.ts

type PipelineStatus = "pending" | "running" | "complete" | "failed";

interface PipelineRun {
  id: string;
  project_name: string;
  status: PipelineStatus;
  created_at: string;
  completed_at: string | null;
  trd: TRD | null;
  arch: ARCH | null;
  artifact_url: string | null;
}

interface TRD {
  project_name: string;
  stack: string;
  database: string;
  auth: string;
  features: string[];
}

interface ARCH {
  file_list: string[];
  dependency_order: string[];
  module_responsibilities: Record<string, string>;
}
```

---

### V3 MVP Scope (Do Not Expand)

**In scope for V3 MVP:**
- User auth (login, register, logout)
- Submit a pipeline run
- View live log stream
- View TRD, ARCH, and REVIEW_REPORT on completion
- Download generated project as `.zip`
- Dashboard showing run history

**Explicitly out of scope for V3 MVP:**
- Editing generated files in-browser
- Re-running individual pipeline stages
- Team/organisation accounts
- Project templates or presets
- Mobile-optimised layout (desktop-first only)
- Dark/light mode toggle
- Internationalisation

---

### V3 Build Order

Build in this exact order. Do not start the next step until the current one is stable and tested.

```
Step 1 — Project scaffold
  Vite + React + TypeScript + TailwindCSS
  ESLint + Prettier configured
  React Router with placeholder pages
  Axios client with interceptors

Step 2 — Auth
  Login + Register pages with React Hook Form + Zod
  Zustand auth store
  ProtectedRoute component
  Token stored in httpOnly cookie (handled server-side) or localStorage

Step 3 — New Run page
  Description form
  Submit to POST /pipeline/run
  Redirect to RunView on success

Step 4 — Live Run View
  StageIndicator component (4 stages, visual states)
  SSE LogStream component
  Poll GET /pipeline/:id for status changes
  TRDPreview + ArchPreview appear on stage completion

Step 5 — Artifacts page
  FileTree component
  CodeViewer with syntax highlighting (use highlight.js or Prism)
  Rendered REVIEW_REPORT.md (use react-markdown)
  Zip download

Step 6 — Dashboard
  Run history list
  Status badges
  Link to each RunView

Step 7 — Polish
  Loading states, skeleton screens
  Error boundaries
  Empty states
  Responsive layout for desktop breakpoints only
```

---

## Important Rules

- `.env` is never committed — never share API keys
- `output/` files are generated artifacts — not committed to source control
- `output/.gitkeep` must not be deleted
- The LLM never makes architecture decisions — only the deterministic layer does
- Never start V3 without V2 API endpoints stable and documented