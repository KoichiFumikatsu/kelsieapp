'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Quincena } from '@/lib/types/modules.types'

/* ── Helpers ── */

/** Compute start/end dates and name for a quincena period */
function quincenaMeta(year: number, month: number, half: 1 | 2) {
  const mm = String(month).padStart(2, '0')
  const monthName = new Date(year, month - 1, 1)
    .toLocaleDateString('es-MX', { month: 'short' })
    .replace('.', '')
  if (half === 1) {
    return {
      nombre: `Quincena 1ra ${monthName} ${year}`,
      fecha_inicio: `${year}-${mm}-01`,
      fecha_fin: `${year}-${mm}-15`,
    }
  }
  const lastDay = new Date(year, month, 0).getDate()
  return {
    nombre: `Quincena 2da ${monthName} ${year}`,
    fecha_inicio: `${year}-${mm}-16`,
    fecha_fin: `${year}-${mm}-${lastDay}`,
  }
}

/** Previous period: 1ra -> previous month 2da, 2da -> same month 1ra */
function prevPeriod(year: number, month: number, half: 1 | 2): { year: number; month: number; half: 1 | 2 } {
  if (half === 1) {
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    return { year: y, month: m, half: 2 }
  }
  return { year, month, half: 1 }
}

/** What period does today fall in? */
function currentPeriod(): { year: number; month: number; half: 1 | 2 } {
  // Use America/Bogota time
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const half: 1 | 2 = now.getDate() <= 15 ? 1 : 2
  return { year, month, half }
}

async function getHouseholdId() {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()
  return { supabase, userId: user.id, householdId: profile?.household_id as string | null }
}

/* ── Public Actions ── */

export async function getQuincenas(): Promise<ActionResult<Quincena[]>> {
  const ctx = await getHouseholdId()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await ctx.supabase
    .from('quincenas')
    .select('*')
    .eq('household_id', ctx.householdId)
    .order('fecha_inicio', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as Quincena[] }
}

/** Get or auto-create the quincena for today's period */
export async function getActiveQuincena(): Promise<ActionResult<Quincena | null>> {
  const { year, month, half } = currentPeriod()
  return ensureQuincena(year, month, half)
}

/** Get or create a quincena for a specific period, with saldo rollover */
export async function ensureQuincena(year: number, month: number, half: 1 | 2): Promise<ActionResult<Quincena | null>> {
  const ctx = await getHouseholdId()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const meta = quincenaMeta(year, month, half)

  // Calculate saldo from previous quincena's ending balance
  const prev = prevPeriod(year, month, half)
  const prevMeta = quincenaMeta(prev.year, prev.month, prev.half)

  let saldoInicial = 0
  let saldoPorMiembro: Record<string, number> = {}

  const { data: prevQ } = await ctx.supabase
    .from('quincenas')
    .select('id, saldo_inicial, saldo_por_miembro')
    .eq('household_id', ctx.householdId)
    .eq('fecha_inicio', prevMeta.fecha_inicio)
    .maybeSingle()

  if (prevQ) {
    const { data: txs } = await ctx.supabase
      .from('transacciones')
      .select('tipo, importe, user_id')
      .eq('quincena_id', prevQ.id)

    const allTxs = txs ?? []
    const prevSaldos: Record<string, number> = (prevQ as any).saldo_por_miembro ?? {}

    // Compute per-member ending balance from previous quincena
    const userIds = [...new Set(allTxs.map((t) => t.user_id).filter(Boolean))]
    for (const uid of userIds) {
      const ut = allTxs.filter((t) => t.user_id === uid)
      const net = (type: string) => ut.filter(t => t.tipo === type).reduce((s, t) => s + Number(t.importe), 0)
      saldoPorMiembro[uid] = (prevSaldos[uid] ?? 0) + net('ingreso') - net('gasto') - net('ahorro') - net('bolsillo') - net('pago_credito')
    }
    // Also carry over any member in prevSaldos that had no transactions this period
    for (const uid of Object.keys(prevSaldos)) {
      if (!(uid in saldoPorMiembro)) saldoPorMiembro[uid] = prevSaldos[uid]
    }

    saldoInicial = Object.values(saldoPorMiembro).reduce((s, v) => s + v, 0)
  }

  // Check if already exists — update saldo_inicial from previous period
  const { data: existing } = await ctx.supabase
    .from('quincenas')
    .select('*')
    .eq('household_id', ctx.householdId)
    .eq('fecha_inicio', meta.fecha_inicio)
    .maybeSingle()

  if (existing) {
    if (prevQ && Number(existing.saldo_inicial) !== saldoInicial) {
      await ctx.supabase
        .from('quincenas')
        .update({ saldo_inicial: saldoInicial, saldo_por_miembro: saldoPorMiembro })
        .eq('id', existing.id)
      return { ok: true, data: { ...existing, saldo_inicial: saldoInicial, saldo_por_miembro: saldoPorMiembro } as Quincena }
    }
    return { ok: true, data: existing as Quincena }
  }

  // Mark all previous as not active
  await ctx.supabase
    .from('quincenas')
    .update({ is_active: false })
    .eq('household_id', ctx.householdId)
    .eq('is_active', true)

  // Create new quincena
  const { data, error } = await ctx.supabase
    .from('quincenas')
    .insert({
      household_id: ctx.householdId,
      nombre: meta.nombre,
      fecha_inicio: meta.fecha_inicio,
      fecha_fin: meta.fecha_fin,
      saldo_inicial: saldoInicial,
      saldo_por_miembro: saldoPorMiembro,
      is_active: true,
      created_by: ctx.userId,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: data as Quincena }
}

export async function updateQuincena(id: string, formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  const nombre = formData.get('nombre') as string | null
  if (nombre) updates.nombre = nombre

  // Per-member saldo fields: saldo_uid_<userId>
  const saldoPorMiembro: Record<string, number> = {}
  let hasMemberSaldo = false
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('saldo_uid_')) {
      const uid = key.replace('saldo_uid_', '')
      saldoPorMiembro[uid] = Number(value)
      hasMemberSaldo = true
    }
  }

  if (hasMemberSaldo) {
    updates.saldo_por_miembro = saldoPorMiembro
    updates.saldo_inicial = Object.values(saldoPorMiembro).reduce((s, v) => s + v, 0)
  } else {
    const saldoInicial = formData.get('saldo_inicial') as string | null
    if (saldoInicial !== null && saldoInicial !== '') updates.saldo_inicial = Number(saldoInicial)
  }

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
