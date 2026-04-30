-- Migration 023: Budget items table
-- Replaces the flat categorias.presupuesto_default approach with
-- a proper per-period budget model supporting frequency and payment status.

CREATE TABLE public.budget_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid        NOT NULL REFERENCES public.households ON DELETE CASCADE,
  parent_id       uuid        REFERENCES public.budget_items ON DELETE CASCADE,
  name            text        NOT NULL,
  frequency       text        NOT NULL DEFAULT 'all'
                  CHECK (frequency IN ('all', 'first', 'second', 'once')),
  amount_planned  numeric     NOT NULL DEFAULT 0,
  due_day         int         CHECK (due_day >= 1 AND due_day <= 31),
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid')),
  quincena_id     uuid        REFERENCES public.quincenas ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver budget_items del household"
  ON public.budget_items FOR SELECT
  USING (household_id = public.get_my_household_id());

CREATE POLICY "Crear budget_items"
  ON public.budget_items FOR INSERT
  WITH CHECK (household_id = public.get_my_household_id());

CREATE POLICY "Editar budget_items"
  ON public.budget_items FOR UPDATE
  USING (household_id = public.get_my_household_id());

CREATE POLICY "Eliminar budget_items"
  ON public.budget_items FOR DELETE
  USING (household_id = public.get_my_household_id());
