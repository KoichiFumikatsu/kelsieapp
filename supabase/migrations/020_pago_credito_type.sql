-- Migration 020: Add 'pago_credito' to categorias and transacciones tipo
-- pago_credito = paying off credit card debt (real money leaves bank)

ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;
ALTER TABLE categorias ADD CONSTRAINT categorias_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'bolsillo', 'credito', 'pago_credito'));

ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_tipo_check;
ALTER TABLE transacciones ADD CONSTRAINT transacciones_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'bolsillo', 'credito', 'pago_credito'));
