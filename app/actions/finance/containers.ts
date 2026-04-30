'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/modules.types'

export type Container = {
  id: string
  household_id: string
  user_id: string | null
  type: 'cuenta' | 'ahorro' | 'bolsillo' | 'credito'
  name: string
  balance: number
  color: string | null
  created_at: string
  updated_at: string
}

export async function getContainers(userId?: string): Promise<ActionResult<Container[]>> {
  const supabase = await createClient()

  let query = supabase
    .from('containers')
    .select('*')
    .order('type')
    .order('name')

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Container[] }
}

export async function createContainer(formData: FormData): Promise<ActionResult<Container>> {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user!
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const type = formData.get('type') as Container['type']
  const name = formData.get('name') as string
  const balance = Number(formData.get('balance') ?? 0)
  const color = (formData.get('color') as string) || null
  const selectedUserId = (formData.get('user_id') as string) || user.id

  if (!type || !name) return { ok: false, error: 'Tipo y nombre son requeridos' }

  const { data, error } = await supabase
    .from('containers')
    .insert({
      household_id: profile.household_id,
      user_id: selectedUserId,
      type,
      name,
      balance,
      color,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Container }
}

export async function updateContainerBalance(
  id: string,
  delta: number,
): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('increment_container_balance', {
    container_id: id,
    amount: delta,
  })

  if (error) {
    // Fallback: fetch and update manually if RPC not yet defined
    const { data: current } = await supabase
      .from('containers')
      .select('balance')
      .eq('id', id)
      .single()

    if (!current) return { ok: false, error: 'Container no encontrado' }

    const { error: updateError } = await supabase
      .from('containers')
      .update({ balance: Number(current.balance) + delta })
      .eq('id', id)

    if (updateError) return { ok: false, error: updateError.message }
  }

  return { ok: true, data: undefined }
}

export async function deleteContainer(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { error } = await supabase.from('containers').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}
