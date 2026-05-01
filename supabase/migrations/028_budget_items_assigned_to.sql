-- Migration 028: Per-member assignment on budget_items
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;
