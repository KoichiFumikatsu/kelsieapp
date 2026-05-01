-- Migration 027: Allow null categoria_id on transacciones
-- Needed for transactions created without an explicit category (e.g. PayBudgetSheet, auto-recharge)

ALTER TABLE transacciones ALTER COLUMN categoria_id DROP NOT NULL;
