-- =============================================
-- Migration 018: Add quincena_half to categorias
-- =============================================

-- 1 = solo 1ra quincena, 2 = solo 2da quincena, NULL = ambas
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS quincena_half smallint CHECK (quincena_half IN (1, 2));
