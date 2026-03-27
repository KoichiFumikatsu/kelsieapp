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
  if (!ctx) return { ok: false, error: 'No autenticado' }

  let query = ctx.supabase
    .from('medicamentos')
    .select('*')
    .eq('user_id', ctx.userId)

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

  if (!nombre) return { ok: false, error: 'El nombre es requerido' }

  const { data, error } = await ctx.supabase
    .from('medicamentos')
    .insert({
      household_id: ctx.householdId,
      user_id: ctx.userId,
      nombre,
      dosis,
      frecuencia,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      notas,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Medicamento }
}

export async function toggleMedicamento(id: string, activo: boolean): Promise<ActionResult<Medicamento>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const { data, error } = await ctx.supabase
    .from('medicamentos')
    .update({ activo })
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Medicamento }
}

export async function deleteMedicamento(id: string): Promise<ActionResult<null>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const { error } = await ctx.supabase
    .from('medicamentos')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
