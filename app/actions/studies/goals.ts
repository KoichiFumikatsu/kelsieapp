'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, StudyGoal, StudyGoalStatus } from '@/lib/types/modules.types'

async function getCtx() {
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

export async function getStudyGoals(): Promise<ActionResult<StudyGoal[]>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await ctx.supabase
    .from('study_goals')
    .select('*, profiles(display_name, color_hex)')
    .eq('household_id', ctx.householdId)
    .order('created_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as StudyGoal[] }
}

export async function getMyStudyGoals(): Promise<ActionResult<StudyGoal[]>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const { data, error } = await ctx.supabase
    .from('study_goals')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as StudyGoal[] }
}

export async function createStudyGoal(formData: FormData): Promise<ActionResult<StudyGoal>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const titulo = formData.get('titulo') as string
  const descripcion = (formData.get('descripcion') as string) || null
  const categoria = formData.get('categoria') as string
  const plataforma = (formData.get('plataforma') as string) || null
  const url = (formData.get('url') as string) || null
  const totalUnidades = Number(formData.get('total_unidades')) || 1
  const fechaInicio = (formData.get('fecha_inicio') as string) || null
  const fechaMeta = (formData.get('fecha_meta') as string) || null
  const selectedUserId = (formData.get('user_id') as string) || ctx.userId
  const horario = (formData.get('horario') as string) || null
  const diasClaseRaw = formData.getAll('dias_clase') as string[]
  const diasClase = diasClaseRaw.length > 0 ? diasClaseRaw : null

  if (!titulo || !categoria) return { ok: false, error: 'Titulo y categoria son requeridos' }

  const { data, error } = await ctx.supabase
    .from('study_goals')
    .insert({
      household_id: ctx.householdId,
      user_id: selectedUserId,
      titulo,
      descripcion,
      categoria,
      plataforma,
      url,
      total_unidades: totalUnidades,
      fecha_inicio: fechaInicio || null,
      fecha_meta: fechaMeta || null,
      horario: horario || null,
      dias_clase: diasClase,
      status: 'not_started',
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as StudyGoal }
}

export async function updateGoalStatus(id: string, status: StudyGoalStatus): Promise<ActionResult<StudyGoal>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await ctx.supabase
    .from('study_goals')
    .update({ status })
    .eq('id', id)
    .eq('household_id', ctx.householdId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as StudyGoal }
}

export async function updateStudyGoal(id: string, formData: FormData): Promise<ActionResult<null>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const updates: Record<string, unknown> = {}
  const titulo = formData.get('titulo') as string | null
  const descripcion = formData.get('descripcion') as string | null
  const categoria = formData.get('categoria') as string | null
  const plataforma = formData.get('plataforma') as string | null
  const url = formData.get('url') as string | null
  const totalUnidades = formData.get('total_unidades') as string | null
  const fechaInicio = formData.get('fecha_inicio') as string | null
  const fechaMeta = formData.get('fecha_meta') as string | null
  const userId = formData.get('user_id') as string | null
  const horario = formData.get('horario') as string | null
  const diasClaseRaw = formData.getAll('dias_clase') as string[]

  if (titulo) updates.titulo = titulo
  if (descripcion !== null) updates.descripcion = descripcion || null
  if (categoria) updates.categoria = categoria
  if (plataforma !== null) updates.plataforma = plataforma || null
  if (url !== null) updates.url = url || null
  if (totalUnidades) updates.total_unidades = Number(totalUnidades)
  if (fechaInicio !== null) updates.fecha_inicio = fechaInicio || null
  if (fechaMeta !== null) updates.fecha_meta = fechaMeta || null
  if (userId) updates.user_id = userId
  if (horario !== null) updates.horario = horario || null
  updates.dias_clase = diasClaseRaw.length > 0 ? diasClaseRaw : null

  const { error } = await ctx.supabase
    .from('study_goals')
    .update(updates)
    .eq('id', id)
    .eq('household_id', ctx.householdId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}

export async function deleteStudyGoal(id: string): Promise<ActionResult<null>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { error } = await ctx.supabase
    .from('study_goals')
    .delete()
    .eq('id', id)
    .eq('household_id', ctx.householdId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
