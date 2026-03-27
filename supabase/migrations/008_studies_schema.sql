-- =============================================
-- FASE 7 — Módulo Studies: Schema
-- Ejecutar en Supabase SQL Editor
-- Compartido: ambos miembros pueden ver (motivación)
-- =============================================

-- 1. STUDY_GOALS — metas de estudio
create table public.study_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  titulo text not null,
  descripcion text,
  categoria text not null check (categoria in ('curso','libro','certificacion','idioma','habilidad')),
  plataforma text,
  url text,
  total_unidades int not null default 1,
  unidades_completadas int not null default 0,
  fecha_inicio date,
  fecha_meta date,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','paused')),
  notify_on_milestone boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. STUDY_SESSIONS — sesiones de estudio
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.study_goals on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  fecha date not null default current_date,
  minutos int not null check (minutos > 0),
  unidades_avanzadas int not null default 0,
  nota text,
  created_at timestamptz default now()
);

-- Trigger: updated_at
create trigger set_updated_at_study_goals
  before update on public.study_goals
  for each row execute procedure public.update_updated_at();

-- =============================================
-- RLS — compartido entre miembros del household
-- =============================================
alter table public.study_goals enable row level security;
alter table public.study_sessions enable row level security;

-- STUDY_GOALS
create policy "Ver metas del household"
  on public.study_goals for select
  using (household_id = public.get_my_household_id());

create policy "Crear metas"
  on public.study_goals for insert
  with check (household_id = public.get_my_household_id());

create policy "Editar metas"
  on public.study_goals for update
  using (household_id = public.get_my_household_id());

create policy "Eliminar metas"
  on public.study_goals for delete
  using (household_id = public.get_my_household_id());

-- STUDY_SESSIONS (via goal's household)
create policy "Ver sesiones del household"
  on public.study_sessions for select
  using (
    goal_id in (
      select id from public.study_goals
      where household_id = public.get_my_household_id()
    )
  );

create policy "Crear sesiones"
  on public.study_sessions for insert
  with check (
    goal_id in (
      select id from public.study_goals
      where household_id = public.get_my_household_id()
    )
  );

create policy "Eliminar sesiones"
  on public.study_sessions for delete
  using (
    goal_id in (
      select id from public.study_goals
      where household_id = public.get_my_household_id()
    )
  );

-- Realtime (opcional, motivación compartida)
alter publication supabase_realtime add table public.study_goals;
