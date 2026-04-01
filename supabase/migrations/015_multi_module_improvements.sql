-- 015: Mejoras multi-modulo
-- Studies: horario de clase
-- Finance: tipos ahorro/bolsillo, categorias por quincena
-- Medical: link medicamento a historial clinico

-- =============================================
-- STUDIES: agregar horario de clase
-- =============================================
ALTER TABLE study_goals ADD COLUMN IF NOT EXISTS horario time DEFAULT NULL;
ALTER TABLE study_goals ADD COLUMN IF NOT EXISTS dias_clase text[] DEFAULT NULL;
  -- valores: lunes, martes, miercoles, jueves, viernes, sabado, domingo

-- =============================================
-- FINANCE: tipos ahorro y bolsillo
-- =============================================
-- Expandir check constraint de categorias
ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;
ALTER TABLE categorias ADD CONSTRAINT categorias_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'bolsillo'));

-- Expandir check constraint de transacciones
ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_tipo_check;
ALTER TABLE transacciones ADD CONSTRAINT transacciones_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'bolsillo'));

-- =============================================
-- MEDICAL: link medicamento a historial clinico
-- =============================================
ALTER TABLE medicamentos ADD COLUMN IF NOT EXISTS record_id uuid DEFAULT NULL
  REFERENCES medical_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_medicamentos_record_id
  ON medicamentos(record_id) WHERE record_id IS NOT NULL;
