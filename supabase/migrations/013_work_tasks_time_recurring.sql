-- 013: Agregar hora limite y tareas repetitivas a work_tasks

-- Hora limite (ej: 14:30)
ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS due_time time DEFAULT NULL;

-- Campos de recurrencia
ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS recurrence_pattern text DEFAULT NULL;
  -- valores: 'daily', 'weekly', 'monthly'
ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS recurrence_end date DEFAULT NULL;

-- Indice para buscar tareas con hora limite activa (para pg_cron)
CREATE INDEX IF NOT EXISTS idx_work_tasks_due_time
  ON work_tasks (due_date, due_time)
  WHERE status NOT IN ('done', 'cancelled')
    AND due_date IS NOT NULL
    AND due_time IS NOT NULL;
