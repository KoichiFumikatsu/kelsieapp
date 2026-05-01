'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, AutoRecharged, Transaccion, TransaccionConCategoria } from '@/lib/types/modules.types'

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

export async function createTransaccion(formData: FormData): Promise<ActionResult<{ autoRecharged: AutoRecharged[] }>> {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user!
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) return { ok: false, error: 'Sin hogar asignado' }

  const quincenaId = formData.get('quincena_id') as string
  const categoriaId = (formData.get('categoria_id') as string) || null
  const tipo = formData.get('tipo') as string
  const importe = Number(formData.get('importe'))
  const descripcion = (formData.get('descripcion') as string) || null
  const fecha = (formData.get('fecha') as string) || new Date().toISOString().split('T')[0]
  const selectedUserId = (formData.get('user_id') as string) || user.id

  if (!quincenaId || !tipo || !importe) {
    return { ok: false, error: 'Campos requeridos: quincena, tipo, importe' }
  }

  const { error } = await supabase
    .from('transacciones')
    .insert({
      quincena_id: quincenaId,
      categoria_id: categoriaId,
      user_id: selectedUserId,
      household_id: profile.household_id,
      tipo,
      fecha,
      importe,
      descripcion,
    })

  if (error) return { ok: false, error: error.message }

  const autoRecharged: AutoRecharged[] = []

  if (categoriaId) {
    const { data: cat } = await supabase
      .from('categorias')
      .select('budget_item_id, is_salary, auto_recharge_amount, auto_recharge_user_id')
      .eq('id', categoriaId)
      .single()

    // Auto-mark linked budget item as paid
    if (cat?.budget_item_id) {
      await supabase.from('budget_items').update({ status: 'paid' }).eq('id', cat.budget_item_id)
    }

    // Auto-recharge bolsillos when salary ingreso is recorded
    if (cat?.is_salary && tipo === 'ingreso') {
      const { data: bolsillos } = await supabase
        .from('categorias')
        .select('id, nombre, auto_recharge_amount')
        .eq('household_id', profile.household_id)
        .eq('auto_recharge_user_id', selectedUserId)
        .not('auto_recharge_amount', 'is', null)

      for (const b of bolsillos ?? []) {
        const { error: brErr } = await supabase.from('transacciones').insert({
          quincena_id: quincenaId,
          categoria_id: b.id,
          user_id: selectedUserId,
          household_id: profile.household_id,
          tipo: 'bolsillo',
          fecha,
          importe: b.auto_recharge_amount,
          descripcion: `Recarga automática ${b.nombre}`,
        })
        if (!brErr) autoRecharged.push({ categoriaId: b.id, nombre: b.nombre, amount: Number(b.auto_recharge_amount) })
      }
    }
  }

  return { ok: true, data: { autoRecharged } }
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
