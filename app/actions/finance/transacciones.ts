'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Transaccion, TransaccionConCategoria } from '@/lib/types/modules.types'

export async function getTransacciones(quincenaId: string): Promise<ActionResult<TransaccionConCategoria[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transacciones')
    .select('*, categorias(nombre, icono), profiles(display_name, color_hex)')
    .eq('quincena_id', quincenaId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as TransaccionConCategoria[] }
}

export async function createTransaccion(formData: FormData): Promise<ActionResult<Transaccion>> {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user!
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const quincenaId = formData.get('quincena_id') as string
  const categoriaId = formData.get('categoria_id') as string
  const tipo = formData.get('tipo') as 'gasto' | 'ingreso' | 'ahorro' | 'bolsillo'
  const importe = Number(formData.get('importe'))
  const descripcion = (formData.get('descripcion') as string) || null
  const fecha = (formData.get('fecha') as string) || new Date().toISOString().split('T')[0]
  const selectedUserId = (formData.get('user_id') as string) || user.id

  if (!quincenaId || !tipo || !importe) {
    return { ok: false, error: 'Campos requeridos: quincena, tipo, importe' }
  }

  const { data, error } = await supabase
    .from('transacciones')
    .insert({
      quincena_id: quincenaId,
      categoria_id: categoriaId || null,
      user_id: selectedUserId,
      household_id: profile.household_id,
      tipo,
      fecha,
      importe,
      descripcion,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Transaccion }
}

export async function deleteTransaccion(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { error } = await supabase.from('transacciones').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}

export async function updateTransaccion(id: string, formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  const categoriaId = formData.get('categoria_id') as string | null
  const tipo = formData.get('tipo') as string | null
  const importe = formData.get('importe') as string | null
  const descripcion = formData.get('descripcion') as string | null
  const fecha = formData.get('fecha') as string | null
  const userId = formData.get('user_id') as string | null

  if (categoriaId) updates.categoria_id = categoriaId
  if (tipo) updates.tipo = tipo
  if (importe) updates.importe = Number(importe)
  if (formData.has('descripcion')) updates.descripcion = descripcion || null
  if (fecha) updates.fecha = fecha
  if (userId) updates.user_id = userId

  const { error } = await supabase.from('transacciones').update(updates).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
