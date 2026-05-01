# Antigravity: Agentic Backend Orchestration

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![CrewAI](https://img.shields.io/badge/CrewAI-FF4F00?style=for-the-badge&logo=crewai)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

Antigravity is an autonomous backend development platform powered by an orchestrated system of specialized LLM agents. It accelerates the entire Software Development Life Cycle (SDLC) by taking a single prompt, interacting with the user to clarify intent, and outputting a statically validated, production-ready FastAPI backend.

## 🚀 Value Proposition

Antigravity drastically reduces the time from idea to validated backend. By automating intent extraction, architecture design, and code generation, it eliminates the traditional friction of backend bootstrapping. The SDLC is accelerated because:
1. **Zero-Friction Scoping:** The `Explorer Agent` automatically handles requirements gathering.
2. **Autonomous Engineering:** Agents dynamically build the Technical Requirements Document (TRD) and generate code.
3. **Automated QA:** The platform guarantees syntactic correctness before human review through static analysis, shifting validation left.

## 🧠 System Architecture

The platform relies on a distributed agentic workflow orchestrated via CrewAI. The agents interact sequentially to guarantee output quality:

1. **Explorer Agent**: Initiates the session, queries the user to resolve ambiguities, and enforces a strict intent schema.
2. **Architect Agent**: Translates the normalized intent into a Technical Requirements Document (TRD) and architectural design.
3. **Developer Agent**: Implements the required APIs using clean, modular FastAPI code.
4. **Reviewer Agent / Auto-Corrector**: Validates the output iteratively until all constraints and syntax requirements are met.

## 🔬 Technical Edge

### Intent Extraction & The Explorer Agent
The `Explorer Agent` utilizes a deterministic dialogue flow. It evaluates the user's prompt against conversation history, explicitly deciding to output either a `questions` schema for more context or an `intent` schema (comprising `project_name`, `features`, `scale`, `needs_auth`, `constraints`, `out_of_scope`) when scoping is complete. A `force_intent_extraction` fallback guarantees progression after a defined number of conversational rounds.

### Python AST for Static Validation
To prevent hallucinated, syntactically invalid code from breaking the pipeline, the system incorporates a rigid Abstract Syntax Tree (AST) checker (`utils/ast_validator.py` / `utils/ast_checker.py`). 
Generated Python code is evaluated statically prior to execution. Any syntax errors, undefined variables, or malformed structures are caught in-memory and immediately fed back into the agentic loop for auto-correction, ensuring the final output is syntactically flawless.

## 🏭 Production Readiness

### Docker & Container Orchestration
The environment is containerized for seamless local deployment and scalability, leveraging `docker-compose`:
- **`api` Service**: Runs the core FastAPI web server (`uvicorn`).
- **`worker` Service**: A Celery distributed task queue for processing asynchronous agentic generation workloads.
- **`redis` Service**: Acts as the message broker and state store for Celery.

### Fault-Tolerant API Failover Logic
To mitigate LLM API rate limits and connection drops, the system implements robust failover logic (`utils/llm_client.py`). It dynamically loads multiple API keys (e.g., `GROQ_API_KEY`, `GROQ_API_KEY_2`, etc.) and automatically rotates keys upon catching `RateLimitError` exceptions. This ensures uninterrupted execution of long-running agentic tasks.

## ⚡ Quick Start

Bootstrapping the Antigravity backend takes just minutes using Docker.

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd forge-monorepo/agentic-dev-studio
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Add your GROQ_API_KEYs and other required secrets to .env
   ```

3. **Start the Services:**
   ```bash
   docker-compose up --build -d
   ```

4. **Verify Deployment:**
   The API will be available at `http://localhost:8001`.