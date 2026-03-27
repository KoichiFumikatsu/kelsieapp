-- 011: Campos de programacion para medicamentos (recordatorios)
-- Agrega hora_inicio, frecuencia_horas, duracion_dias y proxima_toma

ALTER TABLE medicamentos
  ADD COLUMN IF NOT EXISTS hora_inicio      time             DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frecuencia_horas integer          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracion_dias    integer          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS proxima_toma     timestamptz      DEFAULT NULL;

-- Indice para que el cron busque rapido las tomas pendientes
CREATE INDEX IF NOT EXISTS idx_medicamentos_proxima_toma
  ON medicamentos (proxima_toma)
  WHERE activo = true AND proxima_toma IS NOT NULL;
