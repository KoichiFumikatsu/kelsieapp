'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, MedicalRecord } from '@/lib/types/modules.types'

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

export async function getMedicalRecords(): Promise<ActionResult<MedicalRecord[]>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const { data, error } = await ctx.supabase
    .from('medical_records')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('fecha', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as MedicalRecord[] }
}

export async function createMedicalRecord(formData: FormData): Promise<ActionResult<MedicalRecord>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const tipo = formData.get('tipo') as string
  const especialidad = (formData.get('especialidad') as string) || null
  const fecha = formData.get('fecha') as string
  const proximaCita = (formData.get('proxima_cita') as string) || null
  const doctor = (formData.get('doctor') as string) || null
  const clinica = (formData.get('clinica') as string) || null
  const notas = (formData.get('notas') as string) || null

  if (!tipo || !fecha) return { ok: false, error: 'Tipo y fecha son requeridos' }

  const { data, error } = await ctx.supabase
    .from('medical_records')
    .insert({
      household_id: ctx.householdId,
      user_id: ctx.userId,
      tipo,
      especialidad,
      fecha,
      proxima_cita: proximaCita || null,
      doctor,
      clinica,
      notas,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as MedicalRecord }
}

export async function updateMedicalRecord(id: string, formData: FormData): Promise<ActionResult<MedicalRecord>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const tipo = formData.get('tipo') as string
  const especialidad = (formData.get('especialidad') as string) || null
  const fecha = formData.get('fecha') as string
  const proximaCita = (formData.get('proxima_cita') as string) || null
  const doctor = (formData.get('doctor') as string) || null
  const clinica = (formData.get('clinica') as string) || null
  const notas = (formData.get('notas') as string) || null

  const { data, error } = await ctx.supabase
    .from('medical_records')
    .update({ tipo, especialidad, fecha, proxima_cita: proximaCita || null, doctor, clinica, notas })
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as MedicalRecord }
}

export async function deleteMedicalRecord(id: string): Promise<ActionResult<null>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const { error } = await ctx.supabase
    .from('medical_records')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
