-- =============================================
-- FIX: Infinite recursion en policies de profiles
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Función helper que bypasea RLS para obtener household_id del usuario actual
create or replace function public.get_my_household_id()
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

-- 2. DROP de todas las políticas afectadas
drop policy if exists "Miembros pueden ver su household" on public.households;
drop policy if exists "Owner puede actualizar household" on public.households;
drop policy if exists "Ver perfiles del mismo household" on public.profiles;
drop policy if exists "Usuario puede actualizar su propio perfil" on public.profiles;
drop policy if exists "Ver permisos del household" on public.module_permissions;
drop policy if exists "Owner puede gestionar permisos" on public.module_permissions;
drop policy if exists "Ver logs del household" on public.notification_log;

-- 3. Política INSERT para profiles (faltaba — necesaria para registro)
create policy "Usuario puede insertar su propio perfil"
  on public.profiles for insert
  with check (id = auth.uid());

-- 4. Recrear policies usando get_my_household_id() en vez de subquery a profiles

-- HOUSEHOLDS
create policy "Miembros pueden ver su household"
  on public.households for select
  using (id = public.get_my_household_id());

create policy "Owner puede actualizar household"
  on public.households for update
  using (
    id = public.get_my_household_id()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'owner'
    )
  );

-- PROFILES: ya no hay recursión
create policy "Ver perfiles del mismo household"
  on public.profiles for select
  using (
    household_id = public.get_my_household_id()
    or id = auth.uid()
  );

create policy "Usuario puede actualizar su propio perfil"
  on public.profiles for update
  using (id = auth.uid());

-- MODULE_PERMISSIONS
create policy "Ver permisos del household"
  on public.module_permissions for select
  using (household_id = public.get_my_household_id());

create policy "Owner puede gestionar permisos"
  on public.module_permissions for all
  using (
    household_id = public.get_my_household_id()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'owner'
    )
  );

-- NOTIFICATION_LOG
create policy "Ver logs del household"
  on public.notification_log for select
  using (household_id = public.get_my_household_id());
