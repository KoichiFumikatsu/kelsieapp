'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Categoria } from '@/lib/types/modules.types'

export async function getCategorias(): Promise<ActionResult<Categoria[]>> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('household_id', profile.household_id)
    .order('orden')

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Categoria[] }
}

export async function createCategoria(formData: FormData): Promise<ActionResult<Categoria>> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const nombre = formData.get('nombre') as string
  const tipo = formData.get('tipo') as 'gasto' | 'ingreso'
  const presupuestoDefault = Number(formData.get('presupuesto_default') || 0)
  const icono = (formData.get('icono') as string) || 'circle'

  if (!nombre || !tipo) return { ok: false, error: 'Nombre y tipo son requeridos' }

  // Get next orden number
  const { count } = await supabase
    .from('categorias')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', profile.household_id)

  const { data, error } = await supabase
    .from('categorias')
    .insert({
      household_id: profile.household_id,
      nombre,
      tipo,
      presupuesto_default: presupuestoDefault,
      icono,
      orden: (count ?? 0) + 1,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Categoria }
}

export async function updateCategoria(id: string, formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  const nombre = formData.get('nombre') as string | null
  const presupuestoDefault = formData.get('presupuesto_default')
  const icono = formData.get('icono') as string | null

  if (nombre) updates.nombre = nombre
  if (presupuestoDefault != null) updates.presupuesto_default = Number(presupuestoDefault)
  if (icono) updates.icono = icono

  const { error } = await supabase.from('categorias').update(updates).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}

export async function deleteCategoria(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
