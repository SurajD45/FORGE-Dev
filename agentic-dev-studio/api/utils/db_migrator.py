"""
Automatic Schema Validation & Migration for pipeline_runs table.

Called at startup by both FastAPI (lifespan) and Celery (worker_ready signal).
Ensures the state-machine columns exist before the service accepts any work.
"""
import logging
import sys

logger = logging.getLogger(__name__)

# Columns required by the state-machine flow
REQUIRED_COLUMNS = [
    "project_idea",
    "conversation_history",
    "explorer_questions",
    "current_round",
]

MIGRATION_SQL = """
ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS project_idea TEXT,
  ADD COLUMN IF NOT EXISTS conversation_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS explorer_questions JSONB,
  ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 0;
"""


def check_schema(supabase) -> list:
    """
    Probe pipeline_runs via PostgREST to detect missing columns.

    For each required column, issues a select().limit(0) call.
    If PostgREST returns an error mentioning the column does not exist,
    it is flagged as missing.

    Returns:
        List of missing column names (empty = schema is valid).
        Returns empty list if the database is unreachable (network errors
        are treated as non-blocking — the app will start and fail on
        actual API calls with clear errors).
    """
    missing = []
    for col in REQUIRED_COLUMNS:
        try:
            supabase.table("pipeline_runs").select(col).limit(0).execute()
        except Exception as e:
            error_msg = str(e).lower()
            if "does not exist" in error_msg or "column" in error_msg:
                missing.append(col)
                logger.warning(f"Column '{col}' missing from pipeline_runs")
            elif ("name or service not known" in error_msg
                  or "connection" in error_msg
                  or "errno" in error_msg
                  or "timeout" in error_msg
                  or "unreachable" in error_msg):
                # Network/DNS not ready — common during Docker startup.
                # Skip the entire check; don't block the app.
                logger.info(
                    f"Schema check skipped — database unreachable "
                    f"(DNS/network not ready). This is normal during "
                    f"Docker container startup."
                )
                return []
            else:
                # Unexpected error — could be auth, permissions, etc.
                logger.warning(
                    f"Could not probe column '{col}': {e}"
                )
    return missing


def run_migration(supabase) -> bool:
    """
    Attempt to auto-migrate by calling a pre-seeded RPC function.

    The migration SQL file (001_add_state_machine_columns.sql) creates
    a function `forge_apply_migration_001()` that can be called via
    supabase.rpc(). If the function does not exist, this will fail
    gracefully and fall through to the manual error path.

    Returns:
        True if migration succeeded, False otherwise.
    """
    try:
        logger.info("Attempting auto-migration via RPC: forge_apply_migration_001()...")
        supabase.rpc("forge_apply_migration_001", {}).execute()
        logger.info("Auto-migration RPC executed successfully.")
        return True
    except Exception as e:
        logger.error(f"Auto-migration failed: {e}")
        logger.error(
            "The RPC function 'forge_apply_migration_001' may not exist yet. "
            "Run the full migration SQL manually first, then auto-migrate "
            "will work for future migrations."
        )
        return False


def _print_migration_banner(missing_columns: list):
    """Print a clear, human-readable error with the exact SQL to run."""
    cols_display = "\n".join(f"    - {col}" for col in missing_columns)
    banner = f"""
╔══════════════════════════════════════════════════════════════╗
║  SCHEMA MIGRATION REQUIRED                                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  The following columns are missing from 'pipeline_runs':     ║
{cols_display}
║                                                              ║
║  Run this SQL in the Supabase SQL Editor:                    ║
║                                                              ║
║    ALTER TABLE pipeline_runs                                  ║
║      ADD COLUMN IF NOT EXISTS project_idea TEXT,              ║
║      ADD COLUMN IF NOT EXISTS conversation_history            ║
║        JSONB DEFAULT '[]'::jsonb,                             ║
║      ADD COLUMN IF NOT EXISTS explorer_questions JSONB,       ║
║      ADD COLUMN IF NOT EXISTS current_round INTEGER           ║
║        DEFAULT 0;                                            ║
║                                                              ║
║  Or set AUTO_MIGRATE_DB=true in .env for auto-migration.     ║
║                                                              ║
║  Migration file: migrations/001_add_state_machine_columns.sql║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)


def validate_schema_or_die(settings) -> None:
    """
    Single entry point for schema validation at startup.

    Called by both FastAPI lifespan and Celery worker_ready signal.
    If columns are missing and auto-migrate is disabled (or fails),
    the process is terminated with a clear error message.
    """
    from api.dependencies import get_supabase_client

    logger.info("Running schema validation for pipeline_runs...")

    try:
        supabase = get_supabase_client()
    except Exception as e:
        logger.error(f"Cannot connect to Supabase for schema validation: {e}")
        # Don't block startup if Supabase is temporarily unreachable
        # The actual API calls will fail later with clear auth errors
        logger.warning("Skipping schema validation — Supabase unavailable.")
        return

    missing = check_schema(supabase)

    if not missing:
        logger.info("Schema validation passed — all required columns exist.")
        return

    logger.warning(f"Schema validation found {len(missing)} missing column(s): {missing}")

    if settings.auto_migrate_db:
        success = run_migration(supabase)
        if success:
            # Re-check to confirm
            still_missing = check_schema(supabase)
            if not still_missing:
                logger.info("Schema validation passed after auto-migration.")
                return
            else:
                logger.error(
                    f"Auto-migration ran but columns still missing: {still_missing}"
                )

    # If we get here, migration is needed and either auto-migrate is off
    # or it failed. Print the banner and stop.
    _print_migration_banner(missing)
    logger.critical("Service cannot start without the required schema migration.")
    sys.exit(1)
