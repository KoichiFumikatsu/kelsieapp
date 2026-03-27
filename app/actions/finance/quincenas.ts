'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Quincena } from '@/lib/types/modules.types'

export async function getQuincenas(): Promise<ActionResult<Quincena[]>> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await supabase
    .from('quincenas')
    .select('*')
    .eq('household_id', profile.household_id)
    .order('fecha_inicio', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Quincena[] }
}

export async function getActiveQuincena(): Promise<ActionResult<Quincena | null>> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await supabase
    .from('quincenas')
    .select('*')
    .eq('household_id', profile.household_id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Quincena | null }
}

export async function createQuincena(formData: FormData): Promise<ActionResult<Quincena>> {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user!
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const nombre = formData.get('nombre') as string
  const fechaInicio = formData.get('fecha_inicio') as string
  const fechaFin = formData.get('fecha_fin') as string
  const saldoInicial = Number(formData.get('saldo_inicial'))

  if (!nombre || !fechaInicio || !fechaFin || !saldoInicial) {
    return { ok: false, error: 'Todos los campos son requeridos' }
  }

  // Desactivar quincena activa anterior
  await supabase
    .from('quincenas')
    .update({ is_active: false })
    .eq('household_id', profile.household_id)
    .eq('is_active', true)

  const { data, error } = await supabase
    .from('quincenas')
    .insert({
      household_id: profile.household_id,
      nombre,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      saldo_inicial: saldoInicial,
      is_active: true,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  // Copiar presupuestos default de categorías
  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, presupuesto_default')
    .eq('household_id', profile.household_id)

  if (categorias && categorias.length > 0) {
    const presupuestos = categorias.map((c) => ({
      quincena_id: data.id,
      categoria_id: c.id,
      monto_previsto: c.presupuesto_default,
    }))
    await supabase.from('presupuesto_quincena').insert(presupuestos)
  }

  return { ok: true, data: data as Quincena }
}

export async function updateQuincena(id: string, formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  const nombre = formData.get('nombre') as string | null
  const saldoInicial = formData.get('saldo_inicial')
  if (nombre) updates.nombre = nombre
  if (saldoInicial) updates.saldo_inicial = Number(saldoInicial)

  const { error } = await supabase
    .from('quincenas')
    .update(updates)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}

export async function deleteQuincena(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { error } = await supabase.from('quincenas').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
