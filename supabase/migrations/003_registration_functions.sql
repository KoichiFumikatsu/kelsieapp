-- =============================================
-- FIX: Funciones para registro (bypass RLS)
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Función para setup de owner: crea household, vincula profile, crea permisos
create or replace function public.setup_owner(
  p_user_id uuid,
  p_display_name text,
  p_household_name text
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_household_id uuid;
begin
  -- Crear household
  insert into public.households (name)
  values (p_household_name)
  returning id into v_household_id;

  -- Actualizar profile (ya creado por trigger)
  update public.profiles
  set household_id = v_household_id,
      display_name = p_display_name,
      role = 'owner'
  where id = p_user_id;

  -- Crear permisos para los 5 módulos
  insert into public.module_permissions (household_id, user_id, module, can_view, can_edit, can_delete, can_manage)
  values
    (v_household_id, p_user_id, 'finance',  true, true, true, true),
    (v_household_id, p_user_id, 'chores',   true, true, true, true),
    (v_household_id, p_user_id, 'tasks',    true, true, true, true),
    (v_household_id, p_user_id, 'medical',  true, true, true, true),
    (v_household_id, p_user_id, 'studies',  true, true, true, true);

  return v_household_id;
end;
$$;

-- Función para setup de member: vincula a household existente, crea permisos
create or replace function public.setup_member(
  p_user_id uuid,
  p_display_name text,
  p_household_id uuid
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Actualizar profile
  update public.profiles
  set household_id = p_household_id,
      display_name = p_display_name,
      role = 'member'
  where id = p_user_id;

  -- Crear permisos (view + edit, sin delete/manage)
  insert into public.module_permissions (household_id, user_id, module, can_view, can_edit, can_delete, can_manage)
  values
    (p_household_id, p_user_id, 'finance',  true, true, false, false),
    (p_household_id, p_user_id, 'chores',   true, true, false, false),
    (p_household_id, p_user_id, 'tasks',    true, true, false, false),
    (p_household_id, p_user_id, 'medical',  true, true, false, false),
    (p_household_id, p_user_id, 'studies',  true, true, false, false);
end;
$$;
