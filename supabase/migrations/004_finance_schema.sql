-- =============================================
-- FASE 3 — Módulo Finance: Schema
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. QUINCENAS — períodos quincenales
create table public.quincenas (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  saldo_inicial numeric not null check (saldo_inicial > 0),
  is_active boolean default false,
  created_by uuid not null references public.profiles on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. CATEGORÍAS — tipos de gasto/ingreso
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('gasto', 'ingreso')),
  presupuesto_default numeric default 0,
  icono text default 'circle',
  orden int default 0,
  created_at timestamptz default now()
);

-- 3. PRESUPUESTO POR QUINCENA — monto previsto por categoría
create table public.presupuesto_quincena (
  id uuid primary key default gen_random_uuid(),
  quincena_id uuid not null references public.quincenas on delete cascade,
  categoria_id uuid not null references public.categorias on delete cascade,
  monto_previsto numeric not null default 0,
  unique (quincena_id, categoria_id)
);

-- 4. TRANSACCIONES
create table public.transacciones (
  id uuid primary key default gen_random_uuid(),
  quincena_id uuid not null references public.quincenas on delete cascade,
  categoria_id uuid not null references public.categorias on delete cascade,
  user_id uuid not null references public.profiles on delete set null,
  household_id uuid not null references public.households on delete cascade,
  tipo text not null check (tipo in ('gasto', 'ingreso')),
  fecha date not null default current_date,
  importe numeric not null check (importe > 0),
  descripcion text,
  created_at timestamptz default now()
);

-- Triggers: updated_at
create trigger set_updated_at
  before update on public.quincenas
  for each row execute procedure public.update_updated_at();

-- =============================================
-- RLS
-- =============================================
alter table public.quincenas enable row level security;
alter table public.categorias enable row level security;
alter table public.presupuesto_quincena enable row level security;
alter table public.transacciones enable row level security;

-- QUINCENAS: miembros del household
create policy "Ver quincenas del household"
  on public.quincenas for select
  using (household_id = public.get_my_household_id());

create policy "Crear quincenas"
  on public.quincenas for insert
  with check (household_id = public.get_my_household_id());

create policy "Editar quincenas"
  on public.quincenas for update
  using (household_id = public.get_my_household_id());

create policy "Eliminar quincenas"
  on public.quincenas for delete
  using (household_id = public.get_my_household_id());

-- CATEGORÍAS: miembros del household
create policy "Ver categorías del household"
  on public.categorias for select
  using (household_id = public.get_my_household_id());

create policy "Crear categorías"
  on public.categorias for insert
  with check (household_id = public.get_my_household_id());

create policy "Editar categorías"
  on public.categorias for update
  using (household_id = public.get_my_household_id());

create policy "Eliminar categorías"
  on public.categorias for delete
  using (household_id = public.get_my_household_id());

-- PRESUPUESTO_QUINCENA: via join con quincena
create policy "Ver presupuesto"
  on public.presupuesto_quincena for select
  using (
    quincena_id in (
      select id from public.quincenas
      where household_id = public.get_my_household_id()
    )
  );

create policy "Crear presupuesto"
  on public.presupuesto_quincena for insert
  with check (
    quincena_id in (
      select id from public.quincenas
      where household_id = public.get_my_household_id()
    )
  );

create policy "Editar presupuesto"
  on public.presupuesto_quincena for update
  using (
    quincena_id in (
      select id from public.quincenas
      where household_id = public.get_my_household_id()
    )
  );

create policy "Eliminar presupuesto"
  on public.presupuesto_quincena for delete
  using (
    quincena_id in (
      select id from public.quincenas
      where household_id = public.get_my_household_id()
    )
  );

-- TRANSACCIONES: miembros del household
create policy "Ver transacciones del household"
  on public.transacciones for select
  using (household_id = public.get_my_household_id());

create policy "Crear transacciones"
  on public.transacciones for insert
  with check (household_id = public.get_my_household_id());

create policy "Editar transacciones"
  on public.transacciones for update
  using (household_id = public.get_my_household_id());

create policy "Eliminar transacciones"
  on public.transacciones for delete
  using (household_id = public.get_my_household_id());

-- =============================================
-- Realtime: habilitar para transacciones
-- =============================================
alter publication supabase_realtime add table public.transacciones;
