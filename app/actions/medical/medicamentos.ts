'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Medicamento } from '@/lib/types/modules.types'

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

export async function getMedicamentos(onlyActive = true): Promise<ActionResult<Medicamento[]>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  let query = ctx.supabase
    .from('medicamentos')
    .select('*, profiles(display_name, color_hex)')
    .eq('household_id', ctx.householdId)

  if (onlyActive) query = query.eq('activo', true)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Medicamento[] }
}

export async function createMedicamento(formData: FormData): Promise<ActionResult<Medicamento>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const nombre = formData.get('nombre') as string
  const dosis = (formData.get('dosis') as string) || null
  const frecuencia = (formData.get('frecuencia') as string) || null
  const fechaInicio = (formData.get('fecha_inicio') as string) || null
  const fechaFin = (formData.get('fecha_fin') as string) || null
  const notas = (formData.get('notas') as string) || null
  const selectedUserId = (formData.get('user_id') as string) || ctx.userId
  const recordId = (formData.get('record_id') as string) || null

  // New scheduling fields
  const horaInicio = (formData.get('hora_inicio') as string) || null
  const frecuenciaHorasRaw = formData.get('frecuencia_horas') as string
  const frecuenciaHoras = frecuenciaHorasRaw ? parseInt(frecuenciaHorasRaw, 10) : null
  const duracionDiasRaw = formData.get('duracion_dias') as string
  const duracionDias = duracionDiasRaw ? parseInt(duracionDiasRaw, 10) : null

  if (!nombre) return { ok: false, error: 'El nombre es requerido' }

  // Calculate proxima_toma from fecha_inicio + hora_inicio
  // America/Bogota = UTC-5 (Colombia has no DST)
  let proximaToma: string | null = null
  if (fechaInicio && horaInicio && frecuenciaHoras) {
    const dt = new Date(`${fechaInicio}T${horaInicio}:00-05:00`)
    const now = new Date()
    while (dt < now) {
      dt.setTime(dt.getTime() + frecuenciaHoras * 3600000)
    }
    if (duracionDias) {
      const endDate = new Date(`${fechaInicio}T23:59:59-05:00`)
      endDate.setDate(endDate.getDate() + duracionDias)
      if (dt > endDate) proximaToma = null
      else proximaToma = dt.toISOString()
    } else {
      proximaToma = dt.toISOString()
    }
  }

  // Auto-calculate fecha_fin from fecha_inicio + duracion_dias if not provided
  let calculatedFechaFin = fechaFin
  if (!calculatedFechaFin && fechaInicio && duracionDias) {
    const end = new Date(fechaInicio)
    end.setDate(end.getDate() + duracionDias)
    calculatedFechaFin = end.toISOString().split('T')[0]
  }

  const { data, error } = await ctx.supabase
    .from('medicamentos')
    .insert({
      household_id: ctx.householdId,
      user_id: selectedUserId,
      nombre,
      dosis,
      frecuencia,
      fecha_inicio: fechaInicio || null,
      fecha_fin: calculatedFechaFin || null,
      notas,
      hora_inicio: horaInicio || null,
      frecuencia_horas: frecuenciaHoras,
      duracion_dias: duracionDias,
      proxima_toma: proximaToma,
      record_id: recordId || null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Medicamento }
}

export async function toggleMedicamento(id: string, activo: boolean): Promise<ActionResult<Medicamento>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await ctx.supabase
    .from('medicamentos')
    .update({ activo })
    .eq('id', id)
    .eq('household_id', ctx.householdId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Medicamento }
}

export async function deleteMedicamento(id: string): Promise<ActionResult<null>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { error } = await ctx.supabase
    .from('medicamentos')
    .delete()
    .eq('id', id)
    .eq('household_id', ctx.householdId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}

export async function updateMedicamento(id: string, formData: FormData): Promise<ActionResult<Medicamento>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const nombre = formData.get('nombre') as string
  const dosis = (formData.get('dosis') as string) || null
  const notas = (formData.get('notas') as string) || null
  const selectedUserId = (formData.get('user_id') as string) || ctx.userId
  const fechaInicio = (formData.get('fecha_inicio') as string) || null
  const horaInicio = (formData.get('hora_inicio') as string) || null
  const recordId = (formData.get('record_id') as string) || null
  const frecuenciaHorasRaw = formData.get('frecuencia_horas') as string
  const frecuenciaHoras = frecuenciaHorasRaw ? parseInt(frecuenciaHorasRaw, 10) : null
  const duracionDiasRaw = formData.get('duracion_dias') as string
  const duracionDias = duracionDiasRaw ? parseInt(duracionDiasRaw, 10) : null

  if (!nombre) return { ok: false, error: 'El nombre es requerido' }

  // Recalculate proxima_toma
  // America/Bogota = UTC-5 (Colombia has no DST)
  let proximaToma: string | null = null
  if (fechaInicio && horaInicio && frecuenciaHoras) {
    const dt = new Date(`${fechaInicio}T${horaInicio}:00-05:00`)
    const now = new Date()
    while (dt < now) {
      dt.setTime(dt.getTime() + frecuenciaHoras * 3600000)
    }
    if (duracionDias) {
      const endDate = new Date(`${fechaInicio}T23:59:59-05:00`)
      endDate.setDate(endDate.getDate() + duracionDias)
      if (dt > endDate) proximaToma = null
      else proximaToma = dt.toISOString()
    } else {
      proximaToma = dt.toISOString()
    }
  }

  let fechaFin: string | null = null
  if (fechaInicio && duracionDias) {
    const end = new Date(fechaInicio)
    end.setDate(end.getDate() + duracionDias)
    fechaFin = end.toISOString().split('T')[0]
  }

  const { data, error } = await ctx.supabase
    .from('medicamentos')
    .update({
      nombre,
      dosis,
      notas,
      user_id: selectedUserId,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin,
      hora_inicio: horaInicio || null,
      frecuencia_horas: frecuenciaHoras,
      duracion_dias: duracionDias,
      proxima_toma: proximaToma,
      record_id: recordId || null,
    })
    .eq('id', id)
    .eq('household_id', ctx.householdId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Medicamento }
}
