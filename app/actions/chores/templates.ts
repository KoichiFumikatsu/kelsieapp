'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, ChoreTemplate } from '@/lib/types/modules.types'

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

export async function getChoreTemplates(): Promise<ActionResult<ChoreTemplate[]>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await ctx.supabase
    .from('chore_templates')
    .select('*')
    .eq('household_id', ctx.householdId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as ChoreTemplate[] }
}

export async function createChoreTemplate(formData: FormData): Promise<ActionResult<ChoreTemplate>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const nombre = formData.get('nombre') as string
  const descripcion = (formData.get('descripcion') as string) || null
  const icono = (formData.get('icono') as string) || 'sparkles'
  const frecuencia = formData.get('frecuencia') as string
  const puntos = Number(formData.get('puntos')) || 10
  const assignedTo = (formData.get('assigned_to') as string) || null

  if (!nombre || !frecuencia) {
    return { ok: false, error: 'Nombre y frecuencia son requeridos' }
  }

  const { data, error } = await ctx.supabase
    .from('chore_templates')
    .insert({
      household_id: ctx.householdId,
      nombre,
      descripcion,
      icono,
      frecuencia,
      puntos,
      assigned_to: assignedTo,
      created_by: ctx.userId,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as ChoreTemplate }
}

export async function updateChoreTemplate(id: string, formData: FormData): Promise<ActionResult<ChoreTemplate>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const nombre = formData.get('nombre') as string
  const descripcion = (formData.get('descripcion') as string) || null
  const icono = (formData.get('icono') as string) || 'sparkles'
  const frecuencia = formData.get('frecuencia') as string
  const puntos = Number(formData.get('puntos')) || 10
  const assignedTo = (formData.get('assigned_to') as string) || null
  const isActive = formData.get('is_active') !== 'false'

  const { data, error } = await ctx.supabase
    .from('chore_templates')
    .update({ nombre, descripcion, icono, frecuencia, puntos, assigned_to: assignedTo, is_active: isActive })
    .eq('id', id)
    .eq('household_id', ctx.householdId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as ChoreTemplate }
}

export async function deleteChoreTemplate(id: string): Promise<ActionResult<null>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { error } = await ctx.supabase
    .from('chore_templates')
    .delete()
    .eq('id', id)
    .eq('household_id', ctx.householdId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
