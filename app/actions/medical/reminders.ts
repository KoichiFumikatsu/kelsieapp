'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, MedicalRecord } from '@/lib/types/modules.types'

export async function getUpcomingReminders(): Promise<ActionResult<MedicalRecord[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const today = new Date().toISOString().split('T')[0]
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('medical_records')
    .select('*, profiles(display_name, color_hex)')
    .eq('household_id', profile.household_id)
    .not('proxima_cita', 'is', null)
    .gte('proxima_cita', today)
    .lte('proxima_cita', inTwoWeeks)
    .order('proxima_cita', { ascending: true })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as MedicalRecord[] }
}
