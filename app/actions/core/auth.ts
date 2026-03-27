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

  // 2. Setup completo via función SECURITY DEFINER (bypass RLS)
  const { error: setupError } = await supabase.rpc('setup_owner', {
    p_user_id: authData.user.id,
    p_display_name: displayName,
    p_household_name: householdName,
  })

  if (setupError) {
    return { ok: false, error: setupError.message }
  }

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

  // 3. Setup como member via función SECURITY DEFINER (bypass RLS)
  const { error: setupError } = await supabase.rpc('setup_member', {
    p_user_id: authData.user.id,
    p_display_name: displayName,
    p_household_id: householdId,
  })

  if (setupError) {
    return { ok: false, error: setupError.message }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
