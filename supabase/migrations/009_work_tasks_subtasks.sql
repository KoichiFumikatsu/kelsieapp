-- =============================================
-- FASE 9 — Parches: subtasks en work_tasks
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Agregar columna subtasks como JSONB array
-- Formato: [{"text": "hacer X", "done": false}, ...]
alter table public.work_tasks
  add column if not exists subtasks jsonb default '[]'::jsonb;
