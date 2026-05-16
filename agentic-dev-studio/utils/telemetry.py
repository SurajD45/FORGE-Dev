"""
FORGE Telemetry — Lightweight, non-blocking event logger.

Logs pipeline events to the `product_telemetry` Supabase table and optionally
fires Discord/Slack webhooks for CRITICAL and RATE_LIMIT events.

Design constraints (1GB EC2 / 350MB worker container):
  - Pure synchronous execution — no threads, no asyncio, no executor pools.
  - No in-memory buffers or batch queues — each event is a single HTTP POST.
  - All exceptions are swallowed and logged to stderr — telemetry must NEVER
    crash the pipeline.
  - Supabase client is reused via the existing @lru_cache'd factory.

Table schema (product_telemetry — already exists in Supabase):
  - stage       TEXT       e.g. 'STAGE_3_DEVELOPER', 'ORCHESTRATOR'
  - event_type  TEXT       severity flag: 'INFO', 'WARNING', 'CRITICAL', 'RATE_LIMIT'
  - message     TEXT       human-readable checkpoint summary
  - metadata    JSONB      flexible payload (action_type, filename, duration_ms, etc.)
"""

import os
import logging

logger = logging.getLogger(__name__)


def _get_supabase():
    """
    Lazy import of the cached service-role Supabase client.
    Bypasses RLS for server-side inserts from the Celery worker.
    """
    from api.dependencies import get_supabase_client
    return get_supabase_client()


def log_event(
    stage: str,
    event_type: str,
    message: str,
    pipeline_id: str = None,
    metadata: dict = None,
) -> None:
    """
    Fire-and-forget insert into product_telemetry.

    Args:
        stage:       Pipeline stage identifier (e.g. 'STAGE_3_DEVELOPER').
        event_type:  Severity flag: 'INFO', 'WARNING', 'CRITICAL', 'RATE_LIMIT'.
        message:     Human-readable log line.
        pipeline_id: UUID of the pipeline run (nullable for CLI runs).
        metadata:    Optional JSONB payload (filename, duration_ms, etc.).

    Never raises — all exceptions are caught and logged to stderr.
    """
    try:
        row = {
            "stage": stage,
            "event_type": event_type,
            "message": message,
            "metadata": metadata or {},
        }
        if pipeline_id:
            row["pipeline_id"] = pipeline_id

        supabase = _get_supabase()
        supabase.table("product_telemetry").insert(row).execute()

    except Exception as e:
        # Telemetry must never crash the pipeline
        logger.warning(f"Telemetry insert failed (non-critical): {e}")

    # Fire webhooks for high-severity events only
    if event_type in ("CRITICAL", "RATE_LIMIT"):
        _fire_webhook(stage, event_type, message, pipeline_id, metadata)


def _fire_webhook(
    stage: str,
    event_type: str,
    message: str,
    pipeline_id: str = None,
    metadata: dict = None,
) -> None:
    """
    Send a compact alert to Discord and/or Slack for CRITICAL and RATE_LIMIT events.

    Uses httpx (already a transitive dependency of supabase SDK) with a 3-second
    timeout to prevent stalling the Celery worker. If the webhook URL env var is
    empty or unset, the call is a no-op with zero overhead.

    Never raises — all exceptions are caught and logged to stderr.
    """
    discord_url = os.getenv("DISCORD_WEBHOOK_URL", "")
    slack_url = os.getenv("SLACK_WEBHOOK_URL", "")

    if not discord_url and not slack_url:
        return

    # Build a compact summary line
    summary = f"[{event_type}] {stage}: {message}"
    if pipeline_id:
        summary += f" (pipeline: {pipeline_id[:8]}…)"

    # Discord webhook
    if discord_url:
        try:
            import httpx
            httpx.post(
                discord_url,
                json={"content": summary},
                timeout=3.0,
            )
        except Exception as e:
            logger.warning(f"Discord webhook failed (non-critical): {e}")

    # Slack webhook
    if slack_url:
        try:
            import httpx
            httpx.post(
                slack_url,
                json={"text": summary},
                timeout=3.0,
            )
        except Exception as e:
            logger.warning(f"Slack webhook failed (non-critical): {e}")
