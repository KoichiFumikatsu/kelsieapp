'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/modules.types'

export async function getHousehold() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado' }

  // Obtener profile con household
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { ok: false as const, error: 'Sin household asignado' }
  }

  const { data: household, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', profile.household_id)
    .single()

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, data: household }
}

export async function getHouseholdMembers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { ok: false as const, error: 'Sin household' }
  }

  const { data: members, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji, color_hex, role')
    .eq('household_id', profile.household_id)

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, data: members }
}

export async function updateHousehold(formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const name = formData.get('name') as string
  const discordWebhookUrl = formData.get('discord_webhook_url') as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id || profile.role !== 'owner') {
    return { ok: false, error: 'Solo el owner puede editar el hogar' }
  }

  const updates: Record<string, string> = {}
  if (name) updates.name = name
  if (discordWebhookUrl !== null) updates.discord_webhook_url = discordWebhookUrl

  const { error } = await supabase
    .from('households')
    .update(updates)
    .eq('id', profile.household_id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
