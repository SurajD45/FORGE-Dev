-- ============================================================
-- Migration 001: State Machine - Human-in-the-Loop Columns
-- ============================================================
-- Adds columns to pipeline_runs required for the Explorer Agent
-- to pause execution, persist conversation state, and resume
-- after receiving user input.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query)
-- or via the Supabase CLI: supabase db execute -f migrations/001_add_state_machine_columns.sql
-- ============================================================

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS project_idea TEXT,
  ADD COLUMN IF NOT EXISTS conversation_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS explorer_questions JSONB,
  ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 0;

-- Optional: Create an RPC function so the app can self-migrate
-- when AUTO_MIGRATE_DB=true in .env.
CREATE OR REPLACE FUNCTION forge_apply_migration_001()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Idempotent: IF NOT EXISTS prevents errors on re-run
  ALTER TABLE pipeline_runs
    ADD COLUMN IF NOT EXISTS project_idea TEXT,
    ADD COLUMN IF NOT EXISTS conversation_history JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS explorer_questions JSONB,
    ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 0;
END;
$$;
