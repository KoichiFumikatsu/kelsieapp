-- =============================================
-- FASE 4 — Módulo Chores: Schema
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. CHORE_TEMPLATES — plantillas de tareas del hogar
create table public.chore_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  nombre text not null,
  descripcion text,
  icono text default 'sparkles',
  frecuencia text not null check (frecuencia in ('diaria','semanal','quincenal','mensual','unica')),
  puntos int not null default 10,
  assigned_to uuid references public.profiles on delete set null,
  notify_on_complete boolean default true,
  is_active boolean default true,
  created_by uuid not null references public.profiles on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. CHORE_INSTANCES — instancias concretas (una por ocurrencia)
create table public.chore_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.chore_templates on delete cascade,
  household_id uuid not null references public.households on delete cascade,
  assigned_to uuid references public.profiles on delete set null,
  due_date date not null,
  completed_at timestamptz,
  completed_by uuid references public.profiles on delete set null,
  puntos_earned int default 0,
  status text not null default 'pending' check (status in ('pending','done','skipped')),
  nota text,
  created_at timestamptz default now()
);

-- 3. REWARD_LOG — historial de puntos
create table public.reward_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  puntos int not null,
  razon text not null,
  created_at timestamptz default now()
);

-- Triggers: updated_at
create trigger set_updated_at_chore_templates
  before update on public.chore_templates
  for each row execute procedure public.update_updated_at();

-- =============================================
-- RLS — compartido entre miembros del household
-- =============================================
alter table public.chore_templates enable row level security;
alter table public.chore_instances enable row level security;
alter table public.reward_log enable row level security;

-- CHORE_TEMPLATES
create policy "Ver templates del household"
  on public.chore_templates for select
  using (household_id = public.get_my_household_id());

create policy "Crear templates"
  on public.chore_templates for insert
  with check (household_id = public.get_my_household_id());

create policy "Editar templates"
  on public.chore_templates for update
  using (household_id = public.get_my_household_id());

create policy "Eliminar templates"
  on public.chore_templates for delete
  using (household_id = public.get_my_household_id());

-- CHORE_INSTANCES
create policy "Ver instancias del household"
  on public.chore_instances for select
  using (household_id = public.get_my_household_id());

create policy "Crear instancias"
  on public.chore_instances for insert
  with check (household_id = public.get_my_household_id());

create policy "Editar instancias"
  on public.chore_instances for update
  using (household_id = public.get_my_household_id());

create policy "Eliminar instancias"
  on public.chore_instances for delete
  using (household_id = public.get_my_household_id());

-- REWARD_LOG
create policy "Ver rewards del household"
  on public.reward_log for select
  using (household_id = public.get_my_household_id());

create policy "Crear rewards"
  on public.reward_log for insert
  with check (household_id = public.get_my_household_id());

create policy "Eliminar rewards"
  on public.reward_log for delete
  using (household_id = public.get_my_household_id());

-- =============================================
-- Realtime: habilitar para chore_instances
-- =============================================
alter publication supabase_realtime add table public.chore_instances;
