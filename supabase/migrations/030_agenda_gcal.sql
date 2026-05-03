-- Migration 030: Remove hogar from work_tasks, add gcal_event_id, add google_calendar_tokens

UPDATE work_tasks SET categoria = 'trabajo' WHERE categoria = 'hogar';

ALTER TABLE work_tasks DROP CONSTRAINT IF EXISTS work_tasks_categoria_check;
ALTER TABLE work_tasks
  ADD CONSTRAINT work_tasks_categoria_check
  CHECK (categoria IN ('trabajo', 'proyecto'));

ALTER TABLE work_tasks
  ADD COLUMN IF NOT EXISTS gcal_event_id TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  text NOT NULL,
  refresh_token text,
  expires_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gcal_tokens_own"
  ON google_calendar_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
