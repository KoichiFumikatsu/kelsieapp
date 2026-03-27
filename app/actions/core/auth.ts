'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/modules.types'

export async function login(formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { ok: false, error: 'Email y contraseña son requeridos' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, error: error.message }
  }

  redirect('/dashboard')
}

export async function register(formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('display_name') as string
  const householdName = formData.get('household_name') as string

  if (!email || !password || !displayName || !householdName) {
    return { ok: false, error: 'Todos los campos son requeridos' }
  }

  // 1. Registrar usuario en auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  })

  if (authError) {
    return { ok: false, error: authError.message }
  }

  if (!authData.user) {
    return { ok: false, error: 'Error al crear usuario' }
  }

  // 2. Crear household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name: householdName })
    .select('id')
    .single()

  if (householdError) {
    return { ok: false, error: householdError.message }
  }

  // 3. Vincular profile al household como owner
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      household_id: household.id,
      display_name: displayName,
      role: 'owner',
    })
    .eq('id', authData.user.id)

  if (profileError) {
    return { ok: false, error: profileError.message }
  }

  // 4. Crear permisos por defecto (todos los módulos, acceso completo)
  const modules = ['finance', 'chores', 'tasks', 'medical', 'studies'] as const
  const permissions = modules.map((mod) => ({
    household_id: household.id,
    user_id: authData.user!.id,
    module: mod,
    can_view: true,
    can_edit: true,
    can_delete: true,
    can_manage: true,
  }))

  await supabase.from('module_permissions').insert(permissions)

  redirect('/dashboard')
}

export async function joinHousehold(formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('display_name') as string
  const inviteCode = formData.get('invite_code') as string

  if (!email || !password || !displayName || !inviteCode) {
    return { ok: false, error: 'Todos los campos son requeridos' }
  }

  // 1. Buscar household por invite code
  const { data: households, error: lookupError } = await supabase
    .rpc('get_household_by_invite_code', { code: inviteCode })

  if (lookupError || !households || households.length === 0) {
    return { ok: false, error: 'Código de invitación inválido' }
  }

  const householdId = households[0].id

  // 2. Registrar usuario
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  })

  if (authError) {
    return { ok: false, error: authError.message }
  }

  if (!authData.user) {
    return { ok: false, error: 'Error al crear usuario' }
  }

  // 3. Vincular al household como member
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      household_id: householdId,
      display_name: displayName,
      role: 'member',
    })
    .eq('id', authData.user.id)

  if (profileError) {
    return { ok: false, error: profileError.message }
  }

  // 4. Crear permisos por defecto (vista y edición, sin delete/manage)
  const modules = ['finance', 'chores', 'tasks', 'medical', 'studies'] as const
  const permissions = modules.map((mod) => ({
    household_id: householdId,
    user_id: authData.user!.id,
    module: mod,
    can_view: true,
    can_edit: true,
    can_delete: false,
    can_manage: false,
  }))

  await supabase.from('module_permissions').insert(permissions)

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
