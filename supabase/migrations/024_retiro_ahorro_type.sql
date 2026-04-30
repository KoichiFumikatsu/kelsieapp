-- Migration 024: Add 'retiro_ahorro' type
-- retiro_ahorro = withdrawal from savings back to cuenta (ahorro → cuenta)
-- Mirrors 'ahorro' (cuenta → ahorro) to allow full movement history without deleting records

ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;
ALTER TABLE categorias ADD CONSTRAINT categorias_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'retiro_ahorro', 'bolsillo', 'credito', 'pago_credito', 'uso_bolsillo'));

ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_tipo_check;
ALTER TABLE transacciones ADD CONSTRAINT transacciones_tipo_check
  CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'retiro_ahorro', 'bolsillo', 'credito', 'pago_credito', 'uso_bolsillo'));
