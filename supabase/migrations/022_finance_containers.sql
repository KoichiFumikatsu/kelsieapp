-- Migration 022: Finance containers table
-- Tracks named money buckets per user/household (cuenta, ahorro, bolsillos, credito)
-- Non-breaking: transacciones gains nullable from/to_container columns

CREATE TABLE public.containers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households ON DELETE CASCADE,
  user_id       uuid        REFERENCES public.profiles ON DELETE SET NULL,
  type          text        NOT NULL CHECK (type IN ('cuenta', 'ahorro', 'bolsillo', 'credito')),
  name          text        NOT NULL,
  balance       numeric     NOT NULL DEFAULT 0,
  color         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_containers_updated_at
  BEFORE UPDATE ON public.containers
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- RLS
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver containers del household"
  ON public.containers FOR SELECT
  USING (household_id = public.get_my_household_id());

CREATE POLICY "Crear containers"
  ON public.containers FOR INSERT
  WITH CHECK (household_id = public.get_my_household_id());

CREATE POLICY "Editar containers"
  ON public.containers FOR UPDATE
  USING (household_id = public.get_my_household_id());

CREATE POLICY "Eliminar containers"
  ON public.containers FOR DELETE
  USING (household_id = public.get_my_household_id());

-- Add optional container references to transacciones (nullable, backward-compatible)
ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS from_container text,
  ADD COLUMN IF NOT EXISTS to_container   text;
