-- =============================================
-- FASE 5 — Módulo Work Tasks: Schema
-- Ejecutar en Supabase SQL Editor
-- PRIVADO: solo el user_id dueño puede ver/editar
-- =============================================

-- 1. WORK_TASKS — tareas laborales personales
create table public.work_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  titulo text not null,
  descripcion text,
  prioridad text not null default 'mid' check (prioridad in ('low','mid','high','urgent')),
  status text not null default 'backlog' check (status in ('backlog','in_progress','done','cancelled')),
  due_date date,
  tags text[] default '{}',
  notify_on_due boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger: updated_at
create trigger set_updated_at_work_tasks
  before update on public.work_tasks
  for each row execute procedure public.update_updated_at();

-- =============================================
-- RLS — PRIVADO: solo el dueño puede ver/editar
-- =============================================
alter table public.work_tasks enable row level security;

create policy "Ver mis tareas"
  on public.work_tasks for select
  using (user_id = auth.uid());

create policy "Crear mis tareas"
  on public.work_tasks for insert
  with check (user_id = auth.uid());

create policy "Editar mis tareas"
  on public.work_tasks for update
  using (user_id = auth.uid());

create policy "Eliminar mis tareas"
  on public.work_tasks for delete
  using (user_id = auth.uid());

-- NO realtime (datos privados)
