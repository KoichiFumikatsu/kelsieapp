'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, ChoreInstance, ChoreInstanceWithTemplate } from '@/lib/types/modules.types'

async function getHouseholdCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()
  return { supabase, userId: user.id, householdId: profile?.household_id as string | null }
}

export async function getChoreInstances(
  filter: 'pending' | 'done' | 'all' = 'pending',
  dateFrom?: string,
  dateTo?: string
): Promise<ActionResult<ChoreInstanceWithTemplate[]>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  let query = ctx.supabase
    .from('chore_instances')
    .select('*, chore_templates(nombre, icono, puntos, frecuencia), profiles:assigned_to(display_name, color_hex)')
    .eq('household_id', ctx.householdId)

  if (filter === 'pending') query = query.eq('status', 'pending')
  else if (filter === 'done') query = query.eq('status', 'done')

  if (dateFrom) query = query.gte('due_date', dateFrom)
  if (dateTo) query = query.lte('due_date', dateTo)

  const { data, error } = await query.order('due_date', { ascending: true })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as ChoreInstanceWithTemplate[] }
}

export async function getTodayInstances(): Promise<ActionResult<ChoreInstanceWithTemplate[]>> {
  const today = new Date().toISOString().split('T')[0]
  return getChoreInstances('all', today, today)
}

export async function generateInstances(templateId: string, dueDate: string): Promise<ActionResult<ChoreInstance>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  // Get the template to inherit assigned_to
  const { data: template } = await ctx.supabase
    .from('chore_templates')
    .select('assigned_to')
    .eq('id', templateId)
    .single()

  const { data, error } = await ctx.supabase
    .from('chore_instances')
    .insert({
      template_id: templateId,
      household_id: ctx.householdId,
      assigned_to: template?.assigned_to ?? null,
      due_date: dueDate,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as ChoreInstance }
}

export async function generateTodayInstances(): Promise<ActionResult<number>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon...
  const dayOfMonth = new Date().getDate()

  // Get active templates
  const { data: templates, error: tErr } = await ctx.supabase
    .from('chore_templates')
    .select('*')
    .eq('household_id', ctx.householdId)
    .eq('is_active', true)

  if (tErr || !templates) return { ok: false, error: tErr?.message ?? 'Error cargando templates' }

  // Check which templates already have an instance today
  const { data: existing } = await ctx.supabase
    .from('chore_instances')
    .select('template_id')
    .eq('household_id', ctx.householdId)
    .eq('due_date', today)

  const existingIds = new Set((existing ?? []).map((e) => e.template_id))

  const toCreate: { template_id: string; household_id: string; assigned_to: string | null; due_date: string }[] = []

  for (const t of templates) {
    if (existingIds.has(t.id)) continue

    let shouldCreate = false
    switch (t.frecuencia) {
      case 'diaria':
        shouldCreate = true
        break
      case 'semanal':
        shouldCreate = dayOfWeek === 1 // Mondays
        break
      case 'quincenal':
        shouldCreate = dayOfMonth === 1 || dayOfMonth === 16
        break
      case 'mensual':
        shouldCreate = dayOfMonth === 1
        break
      case 'unica':
        // Only create if never created before
        const { count } = await ctx.supabase
          .from('chore_instances')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', t.id)
        shouldCreate = (count ?? 0) === 0
        break
    }

    if (shouldCreate) {
      toCreate.push({
        template_id: t.id,
        household_id: ctx.householdId,
        assigned_to: t.assigned_to,
        due_date: today,
      })
    }
  }

  if (toCreate.length > 0) {
    const { error } = await ctx.supabase.from('chore_instances').insert(toCreate)
    if (error) return { ok: false, error: error.message }
  }

  return { ok: true, data: toCreate.length }
}

export async function completeChore(instanceId: string): Promise<ActionResult<ChoreInstance>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  // Get instance + template puntos
  const { data: instance } = await ctx.supabase
    .from('chore_instances')
    .select('*, chore_templates(puntos)')
    .eq('id', instanceId)
    .single()

  if (!instance) return { ok: false, error: 'Instancia no encontrada' }

  const puntos = (instance.chore_templates as { puntos: number } | null)?.puntos ?? 10

  // Update instance
  const { data, error } = await ctx.supabase
    .from('chore_instances')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      completed_by: ctx.userId,
      puntos_earned: puntos,
    })
    .eq('id', instanceId)
    .eq('household_id', ctx.householdId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  // Log reward
  await ctx.supabase.from('reward_log').insert({
    household_id: ctx.householdId,
    user_id: ctx.userId,
    puntos,
    razon: `Completó tarea`,
  })

  return { ok: true, data: data as ChoreInstance }
}

export async function skipChore(instanceId: string): Promise<ActionResult<ChoreInstance>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await ctx.supabase
    .from('chore_instances')
    .update({ status: 'skipped' })
    .eq('id', instanceId)
    .eq('household_id', ctx.householdId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as ChoreInstance }
}
