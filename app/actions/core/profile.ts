'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/modules.types'

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji, color_hex, role, household_id')
    .eq('id', user.id)
    .single()

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, data }
}

export async function updateProfile(formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const displayName = formData.get('display_name') as string
  const colorHex = formData.get('color_hex') as string

  const updates: Record<string, string> = {}
  if (displayName?.trim()) updates.display_name = displayName.trim()
  if (colorHex?.trim()) updates.color_hex = colorHex.trim()

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: 'Nada que actualizar' }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
