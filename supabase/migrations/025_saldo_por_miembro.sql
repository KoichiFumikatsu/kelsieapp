-- Migration 025: Per-member saldo_inicial on quincenas
-- Replaces single household saldo_inicial with per-member breakdown
-- saldo_por_miembro: { "user_id": amount, ... }
-- saldo_inicial is kept as the household sum for backward compat

ALTER TABLE quincenas ADD COLUMN IF NOT EXISTS saldo_por_miembro jsonb DEFAULT '{}';
