-- Migration: create activity_logs table
-- Tracks editor/admin actions for the dashboard audit log.

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action     TEXT NOT NULL,
  target     TEXT NOT NULL,
  user_name  TEXT,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
  ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Editors and admins can read all log entries
CREATE POLICY "activity_logs_select_editor"
  ON public.activity_logs FOR SELECT
  USING (public.is_editor());

-- Authenticated users can insert their own entries only
CREATE POLICY "activity_logs_insert_authenticated"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- No UPDATE or DELETE policies (append-only audit log)
