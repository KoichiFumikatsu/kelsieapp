-- Migration 010: Make Medical module shared (household-level)
-- Previously scoped to user_id = auth.uid(), now household-level like other shared modules.

-- Drop old user-scoped policies
drop policy if exists "Ver mis registros médicos" on public.medical_records;
drop policy if exists "Crear mis registros médicos" on public.medical_records;
drop policy if exists "Editar mis registros médicos" on public.medical_records;
drop policy if exists "Eliminar mis registros médicos" on public.medical_records;

drop policy if exists "Ver mis medicamentos" on public.medicamentos;
drop policy if exists "Crear mis medicamentos" on public.medicamentos;
drop policy if exists "Editar mis medicamentos" on public.medicamentos;
drop policy if exists "Eliminar mis medicamentos" on public.medicamentos;

-- Create new household-scoped policies

-- MEDICAL_RECORDS
create policy "Ver registros del hogar"
  on public.medical_records for select
  using (household_id = public.get_my_household_id());

create policy "Crear registros del hogar"
  on public.medical_records for insert
  with check (household_id = public.get_my_household_id());

create policy "Editar registros del hogar"
  on public.medical_records for update
  using (household_id = public.get_my_household_id());

create policy "Eliminar registros del hogar"
  on public.medical_records for delete
  using (household_id = public.get_my_household_id());

-- MEDICAMENTOS
create policy "Ver medicamentos del hogar"
  on public.medicamentos for select
  using (household_id = public.get_my_household_id());

create policy "Crear medicamentos del hogar"
  on public.medicamentos for insert
  with check (household_id = public.get_my_household_id());

create policy "Editar medicamentos del hogar"
  on public.medicamentos for update
  using (household_id = public.get_my_household_id());

create policy "Eliminar medicamentos del hogar"
  on public.medicamentos for delete
  using (household_id = public.get_my_household_id());
