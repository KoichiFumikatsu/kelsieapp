'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/modules.types'

export type BudgetItem = {
  id: string
  household_id: string
  parent_id: string | null
  name: string
  frequency: 'all' | 'first' | 'second' | 'once'
  amount_planned: number
  due_day: number | null
  status: 'pending' | 'paid'
  quincena_id: string | null
  created_at: string
  children?: BudgetItem[]
}

export async function getBudgetItems(
  quincenaHalf?: 1 | 2,
): Promise<ActionResult<BudgetItem[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('budget_items')
    .select('*')
    .is('parent_id', null)
    .order('due_day', { ascending: true, nullsFirst: false })
    .order('name')

  if (error) return { ok: false, error: error.message }

  const roots = (data as BudgetItem[]).filter((item) => {
    if (quincenaHalf === undefined) return true
    if (item.frequency === 'all') return true
    if (item.frequency === 'first' && quincenaHalf === 1) return true
    if (item.frequency === 'second' && quincenaHalf === 2) return true
    return false
  })

  return { ok: true, data: roots }
}

export async function createBudgetItem(formData: FormData): Promise<ActionResult<BudgetItem>> {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user!
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const name = formData.get('name') as string
  const frequency = (formData.get('frequency') as BudgetItem['frequency']) || 'all'
  const amount_planned = Number(formData.get('amount_planned') ?? 0)
  const due_day_raw = formData.get('due_day') as string
  const due_day = due_day_raw ? Number(due_day_raw) : null
  const parent_id = (formData.get('parent_id') as string) || null
  const quincena_id = (formData.get('quincena_id') as string) || null

  if (!name) return { ok: false, error: 'Nombre es requerido' }

  const { data, error } = await supabase
    .from('budget_items')
    .insert({
      household_id: profile.household_id,
      parent_id,
      name,
      frequency,
      amount_planned,
      due_day,
      status: 'pending',
      quincena_id,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as BudgetItem }
}

export async function markBudgetItemPaid(
  id: string,
  paid: boolean,
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('budget_items')
    .update({ status: paid ? 'paid' : 'pending' })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function updateBudgetItem(id: string, formData: FormData): Promise<ActionResult<BudgetItem>> {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const frequency = formData.get('frequency') as BudgetItem['frequency']
  const amount_planned = Number(formData.get('amount_planned') ?? 0)
  const due_day_raw = formData.get('due_day') as string
  const due_day = due_day_raw ? Number(due_day_raw) : null

  if (!name) return { ok: false, error: 'Nombre es requerido' }

  const { data, error } = await supabase
    .from('budget_items')
    .update({ name, frequency, amount_planned, due_day })
    .eq('id', id)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as BudgetItem }
}

export async function deleteBudgetItem(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { error } = await supabase.from('budget_items').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}
