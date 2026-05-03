-- Migration 029: Add categoria to work_tasks for Actividades module
ALTER TABLE work_tasks
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'trabajo'
    CHECK (categoria IN ('trabajo', 'proyecto', 'hogar'));
