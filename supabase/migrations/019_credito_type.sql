-- Migration 019: Add 'credito' to categorias and transacciones tipo
-- Credito tracks credit card spending as a separate bucket

ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;
ALTER TABLE categorias ADD CONSTRAINT categorias_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'bolsillo', 'credito'));

ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_tipo_check;
ALTER TABLE transacciones ADD CONSTRAINT transacciones_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'bolsillo', 'credito'));
