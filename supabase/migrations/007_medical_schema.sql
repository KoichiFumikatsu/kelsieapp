-- =============================================
-- FASE 6 — Módulo Medical: Schema
-- Ejecutar en Supabase SQL Editor
-- PRIVADO: solo el user_id dueño puede ver/editar
-- =============================================

-- 1. MEDICAL_RECORDS — registros médicos
create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  tipo text not null check (tipo in ('consulta','examen','vacuna','control')),
  especialidad text,
  fecha date not null,
  proxima_cita date,
  doctor text,
  clinica text,
  notas text,
  archivos jsonb default '[]',
  notify_days_before int default 3,
  created_at timestamptz default now()
);

-- 2. MEDICAMENTOS — seguimiento de medicación
create table public.medicamentos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  nombre text not null,
  dosis text,
  frecuencia text,
  fecha_inicio date,
  fecha_fin date,
  activo boolean default true,
  notas text,
  created_at timestamptz default now()
);

-- =============================================
-- RLS — PRIVADO: solo el dueño puede ver/editar
-- =============================================
alter table public.medical_records enable row level security;
alter table public.medicamentos enable row level security;

-- MEDICAL_RECORDS
create policy "Ver mis registros médicos"
  on public.medical_records for select
  using (user_id = auth.uid());

create policy "Crear mis registros médicos"
  on public.medical_records for insert
  with check (user_id = auth.uid());

create policy "Editar mis registros médicos"
  on public.medical_records for update
  using (user_id = auth.uid());

create policy "Eliminar mis registros médicos"
  on public.medical_records for delete
  using (user_id = auth.uid());

-- MEDICAMENTOS
create policy "Ver mis medicamentos"
  on public.medicamentos for select
  using (user_id = auth.uid());

create policy "Crear mis medicamentos"
  on public.medicamentos for insert
  with check (user_id = auth.uid());

create policy "Editar mis medicamentos"
  on public.medicamentos for update
  using (user_id = auth.uid());

create policy "Eliminar mis medicamentos"
  on public.medicamentos for delete
  using (user_id = auth.uid());

-- NO realtime (datos privados)
