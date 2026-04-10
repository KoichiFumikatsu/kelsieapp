-- Migration 021: Add 'uso_bolsillo' type to categorias and transacciones
-- uso_bolsillo = withdrawal/spend from a bolsillo pocket
-- Does NOT affect saldo (money was already moved out via 'bolsillo')
-- Accumulates across quincenas like credito/pago_credito

ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;
ALTER TABLE categorias ADD CONSTRAINT categorias_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'bolsillo', 'credito', 'pago_credito', 'uso_bolsillo'));

ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_tipo_check;
ALTER TABLE transacciones ADD CONSTRAINT transacciones_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'bolsillo', 'credito', 'pago_credito', 'uso_bolsillo'));
