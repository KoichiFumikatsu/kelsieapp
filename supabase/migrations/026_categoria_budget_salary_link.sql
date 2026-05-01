-- Migration 026: Link categorias to budget_items + salary auto-recharge for bolsillos

ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS budget_item_id uuid REFERENCES budget_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_salary boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_recharge_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_recharge_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
