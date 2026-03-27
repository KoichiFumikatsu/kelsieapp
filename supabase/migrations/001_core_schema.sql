-- =============================================
-- HOUSEHOLD OS — Schema Core
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. HOUSEHOLDS: la unidad base (la pareja)
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  discord_webhook_url text,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. PROFILES: extiende auth.users
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  household_id uuid references public.households on delete set null,
  display_name text not null,
  avatar_emoji text default '🧑',
  color_hex text default '#1A7A5A',
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. PERMISOS POR MÓDULO
create table public.module_permissions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  module text not null check (module in ('finance', 'chores', 'tasks', 'medical', 'studies')),
  can_view boolean default true,
  can_edit boolean default true,
  can_delete boolean default false,
  can_manage boolean default false,
  created_at timestamptz default now(),
  unique (household_id, user_id, module)
);

-- 4. LOG DE NOTIFICACIONES
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  module text not null,
  event_type text not null,
  payload jsonb not null,
  sent_at timestamptz default now(),
  success boolean default false
);

-- =============================================
-- TRIGGER: Crear profile automáticamente al registrar usuario
-- =============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- TRIGGER: Actualizar updated_at automáticamente
-- =============================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.households
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.module_permissions enable row level security;
alter table public.notification_log enable row level security;

-- HOUSEHOLDS: solo miembros pueden ver/editar su household
create policy "Miembros pueden ver su household"
  on public.households for select
  using (
    id in (
      select household_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Owner puede actualizar household"
  on public.households for update
  using (
    id in (
      select household_id from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'owner'
    )
  );

-- Permitir insertar household (al registrarse)
create policy "Usuarios autenticados pueden crear household"
  on public.households for insert
  with check (auth.uid() is not null);

-- PROFILES: miembros del mismo household pueden verse
create policy "Ver perfiles del mismo household"
  on public.profiles for select
  using (
    household_id in (
      select household_id from public.profiles as p
      where p.id = auth.uid()
    )
    or id = auth.uid() -- siempre puede ver su propio perfil
  );

create policy "Usuario puede actualizar su propio perfil"
  on public.profiles for update
  using (id = auth.uid());

-- MODULE_PERMISSIONS: miembros pueden ver permisos de su household
create policy "Ver permisos del household"
  on public.module_permissions for select
  using (
    household_id in (
      select household_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Owner puede gestionar permisos"
  on public.module_permissions for all
  using (
    household_id in (
      select household_id from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'owner'
    )
  );

-- NOTIFICATION_LOG: miembros pueden ver logs de su household
create policy "Ver logs del household"
  on public.notification_log for select
  using (
    household_id in (
      select household_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

create policy "Sistema puede insertar logs"
  on public.notification_log for insert
  with check (auth.uid() is not null);

-- =============================================
-- FUNCIÓN: Buscar household por invite code (público)
-- =============================================
create or replace function public.get_household_by_invite_code(code text)
returns table (id uuid, name text)
language plpgsql
security definer set search_path = ''
as $$
begin
  return query
    select h.id, h.name
    from public.households h
    where h.invite_code = code;
end;
$$;
