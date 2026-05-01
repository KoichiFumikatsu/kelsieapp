'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/modules.types'

export async function resetFinanceData(password: string): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email) return { ok: false, error: 'No autenticado' }

  // Verify password via re-authentication
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (authError) return { ok: false, error: 'Contraseña incorrecta' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }
  const hid = profile.household_id

  // Delete in dependency order
  await supabase.from('transacciones').delete().eq('household_id', hid)
  await supabase.from('budget_items').delete().eq('household_id', hid)
  await supabase.from('quincenas').delete().eq('household_id', hid)

  return { ok: true, data: undefined }
}
