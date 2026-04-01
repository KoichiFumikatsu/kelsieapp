'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, FinanceKPIs } from '@/lib/types/modules.types'

export async function getFinanceKPIs(quincenaId: string): Promise<ActionResult<FinanceKPIs>> {
  const supabase = await createClient()

  // Get quincena + household
  const { data: quincena, error: qErr } = await supabase
    .from('quincenas')
    .select('saldo_inicial, household_id')
    .eq('id', quincenaId)
    .single()

  if (qErr || !quincena) return { ok: false, error: qErr?.message ?? 'Quincena no encontrada' }

  // Get categorias directly (budget comes from presupuesto_default)
  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre, icono, tipo, presupuesto_default')
    .eq('household_id', quincena.household_id)
    .order('orden')

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

  return {
    ok: true,
    data: {
      saldoInicial: Number(quincena.saldo_inicial),
      totalIngresos,
      totalGastos,
      totalAhorros,
      totalBolsillos,
      saldoActual: Number(quincena.saldo_inicial) + totalIngresos - totalGastos - totalAhorros - totalBolsillos,
      porCategoria,
    },
  }
}
