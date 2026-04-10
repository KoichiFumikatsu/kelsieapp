'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, FinanceKPIs } from '@/lib/types/modules.types'

export async function getFinanceKPIs(quincenaId: string): Promise<ActionResult<FinanceKPIs>> {
  const supabase = await createClient()

  // Get quincena + household
  const { data: quincena, error: qErr } = await supabase
    .from('quincenas')
    .select('saldo_inicial, household_id, fecha_inicio, fecha_fin')
    .eq('id', quincenaId)
    .single()

  if (qErr || !quincena) return { ok: false, error: qErr?.message ?? 'Quincena no encontrada' }

  const half = new Date(quincena.fecha_inicio + 'T12:00:00').getDate() === 1 ? 1 : 2

  // Get categorias filtered by quincena_half (null = both halves)
  let catQuery = supabase
    .from('categorias')
    .select('id, nombre, icono, tipo, presupuesto_default')
    .eq('household_id', quincena.household_id)
    .order('orden')

  if (half) {
    catQuery = catQuery.or(`quincena_half.is.null,quincena_half.eq.${half}`)
  }

  const { data: categorias } = await catQuery

  // Get all transactions for this quincena
  const { data: transacciones } = await supabase
    .from('transacciones')
    .select('tipo, importe, categoria_id')
    .eq('quincena_id', quincenaId)

  const totalIngresos = (transacciones ?? [])
    .filter((t) => t.tipo === 'ingreso')
    .reduce((sum, t) => sum + Number(t.importe), 0)

  const totalGastos = (transacciones ?? [])
    .filter((t) => t.tipo === 'gasto')
    .reduce((sum, t) => sum + Number(t.importe), 0)

  const totalAhorros = (transacciones ?? [])
    .filter((t) => t.tipo === 'ahorro')
    .reduce((sum, t) => sum + Number(t.importe), 0)

  const totalBolsillos = (transacciones ?? [])
    .filter((t) => t.tipo === 'bolsillo')
    .reduce((sum, t) => sum + Number(t.importe), 0)

  const totalUsoBolsillo = (transacciones ?? [])
    .filter((t) => t.tipo === 'uso_bolsillo')
    .reduce((sum, t) => sum + Number(t.importe), 0)

  const totalCredito = (transacciones ?? [])
    .filter((t) => t.tipo === 'credito')
    .reduce((sum, t) => sum + Number(t.importe), 0)

  const totalPagoCredito = (transacciones ?? [])
    .filter((t) => t.tipo === 'pago_credito')
    .reduce((sum, t) => sum + Number(t.importe), 0)

  // Group real amounts by category
  const realByCategoria: Record<string, number> = {}
  for (const t of transacciones ?? []) {
    realByCategoria[t.categoria_id] = (realByCategoria[t.categoria_id] ?? 0) + Number(t.importe)
  }

  const porCategoria = (categorias ?? []).map((c) => {
    const real = realByCategoria[c.id] ?? 0
    const previsto = Number(c.presupuesto_default)
    return {
      categoriaId: c.id,
      nombre: c.nombre,
      icono: c.icono ?? 'circle',
      tipo: c.tipo,
      previsto,
      real,
      porcentaje: previsto > 0 ? real / previsto : 0,
    }
  })

  // Accumulated credit debt and bolsillo balance across all quincenas up to this one
  const { data: prevQIds } = await supabase
    .from('quincenas')
    .select('id')
    .eq('household_id', quincena.household_id)
    .lte('fecha_inicio', quincena.fecha_inicio)

  const allQIds = (prevQIds ?? []).map((q) => q.id)

  const { data: allAccumTxs } = await supabase
    .from('transacciones')
    .select('tipo, importe')
    .in('quincena_id', allQIds)
    .in('tipo', ['credito', 'pago_credito', 'bolsillo', 'uso_bolsillo'])

  const acumCredito = (allAccumTxs ?? [])
    .filter((t) => t.tipo === 'credito')
    .reduce((s, t) => s + Number(t.importe), 0)
  const acumPago = (allAccumTxs ?? [])
    .filter((t) => t.tipo === 'pago_credito')
    .reduce((s, t) => s + Number(t.importe), 0)
  const deudaCreditoAcumulada = acumCredito - acumPago

  const acumBolsillo = (allAccumTxs ?? [])
    .filter((t) => t.tipo === 'bolsillo')
    .reduce((s, t) => s + Number(t.importe), 0)
  const acumUsoBolsillo = (allAccumTxs ?? [])
    .filter((t) => t.tipo === 'uso_bolsillo')
    .reduce((s, t) => s + Number(t.importe), 0)
  const saldoBolsillosAcumulado = acumBolsillo - acumUsoBolsillo

  // Credit cut date — 18th of each month, based on today
  // If today <= 18th, the cut date is the 18th of this month
  // If today > 18th, the cut date is the 18th of next month
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  now.setHours(0, 0, 0, 0)
  let corteYear = now.getFullYear()
  let corteMes = now.getMonth() // 0-indexed
  if (now.getDate() > 18) {
    corteMes += 1
    if (corteMes > 11) { corteMes = 0; corteYear++ }
  }
  const fechaCorteCredito = `${corteYear}-${String(corteMes + 1).padStart(2, '0')}-18`

  // Days until cut from today
  const corteDate = new Date(fechaCorteCredito + 'T00:00:00')
  const diasParaCorte = Math.round((corteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    ok: true,
    data: {
      saldoInicial: Number(quincena.saldo_inicial),
      totalIngresos,
      totalGastos,
      totalAhorros,
      totalBolsillos,
      totalUsoBolsillo,
      totalCredito,
      totalPagoCredito,
      saldoActual: Number(quincena.saldo_inicial) + totalIngresos - totalGastos - totalAhorros - totalBolsillos - totalPagoCredito,
      deudaCreditoAcumulada,
      saldoBolsillosAcumulado,
      fechaCorteCredito,
      diasParaCorte,
      porCategoria,
    },
  }
}
