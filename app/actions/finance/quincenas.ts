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

  // Check if already exists
  const { data: existing } = await ctx.supabase
    .from('quincenas')
    .select('*')
    .eq('household_id', ctx.householdId)
    .eq('fecha_inicio', meta.fecha_inicio)
    .maybeSingle()

  if (existing) return { ok: true, data: existing as Quincena }

  // Calculate saldo from previous quincena's ending balance
  const prev = prevPeriod(year, month, half)
  const prevMeta = quincenaMeta(prev.year, prev.month, prev.half)

  let saldoInicial = 0

  const { data: prevQ } = await ctx.supabase
    .from('quincenas')
    .select('id, saldo_inicial')
    .eq('household_id', ctx.householdId)
    .eq('fecha_inicio', prevMeta.fecha_inicio)
    .maybeSingle()

  if (prevQ) {
    // Get transactions for the previous quincena to calculate ending saldo
    const { data: txs } = await ctx.supabase
      .from('transacciones')
      .select('tipo, importe')
      .eq('quincena_id', prevQ.id)

    const ingresos = (txs ?? []).filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.importe), 0)
    const gastos = (txs ?? []).filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.importe), 0)
    const ahorros = (txs ?? []).filter((t) => t.tipo === 'ahorro').reduce((s, t) => s + Number(t.importe), 0)
    const bolsillos = (txs ?? []).filter((t) => t.tipo === 'bolsillo').reduce((s, t) => s + Number(t.importe), 0)

    saldoInicial = Number(prevQ.saldo_inicial) + ingresos - gastos - ahorros - bolsillos
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
  const saldoInicial = formData.get('saldo_inicial') as string | null
  if (nombre) updates.nombre = nombre
  if (saldoInicial !== null && saldoInicial !== '') updates.saldo_inicial = Number(saldoInicial)

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
