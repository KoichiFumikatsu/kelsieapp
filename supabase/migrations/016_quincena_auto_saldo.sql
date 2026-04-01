-- =============================================
-- Migration 016: Allow negative saldo_inicial (rollover from previous quincena)
-- =============================================

-- Drop the >= 0 constraint so rolled-over negative saldos are allowed
ALTER TABLE public.quincenas DROP CONSTRAINT IF EXISTS quincenas_saldo_inicial_check;
