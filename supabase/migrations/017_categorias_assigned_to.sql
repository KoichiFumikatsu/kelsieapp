-- =============================================
-- Migration 017: Add assigned_to on categorias
-- =============================================

-- Allow assigning a category to a specific household member (NULL = shared)
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
