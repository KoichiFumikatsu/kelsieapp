'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, FinanceKPIs, PresupuestoConCategoria } from '@/lib/types/modules.types'

export async function getFinanceKPIs(quincenaId: string): Promise<ActionResult<FinanceKPIs>> {
  const supabase = await createClient()

  // Get quincena
  const { data: quincena, error: qErr } = await supabase
    .from('quincenas')
    .select('saldo_inicial')
    .eq('id', quincenaId)
    .single()

  if (qErr || !quincena) return { ok: false, error: qErr?.message ?? 'Quincena no encontrada' }

  // Get presupuestos with category info
  const { data: presupuestos } = await supabase
    .from('presupuesto_quincena')
    .select('*, categorias(nombre, icono, tipo)')
    .eq('quincena_id', quincenaId) as { data: PresupuestoConCategoria[] | null }

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

  // Group real amounts by category
  const realByCategoria: Record<string, number> = {}
  for (const t of transacciones ?? []) {
    realByCategoria[t.categoria_id] = (realByCategoria[t.categoria_id] ?? 0) + Number(t.importe)
  }

  const porCategoria = (presupuestos ?? []).map((p) => {
    const real = realByCategoria[p.categoria_id] ?? 0
    const previsto = Number(p.monto_previsto)
    return {
      categoriaId: p.categoria_id,
      nombre: p.categorias?.nombre ?? '?',
      icono: p.categorias?.icono ?? 'circle',
      tipo: p.categorias?.tipo ?? 'gasto',
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
      saldoActual: Number(quincena.saldo_inicial) + totalIngresos - totalGastos,
      porCategoria,
    },
  }
}

export async function updatePresupuesto(
  quincenaId: string,
  categoriaId: string,
  montoPrevisto: number,
): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('presupuesto_quincena')
    .upsert(
      { quincena_id: quincenaId, categoria_id: categoriaId, monto_previsto: montoPrevisto },
      { onConflict: 'quincena_id,categoria_id' },
    )

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
