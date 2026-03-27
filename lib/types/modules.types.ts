// Tipos de dominio por módulo — se implementarán en Fase 1-7

// Patrón de retorno para Server Actions
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }

// =============================================
// FINANCE
// =============================================

export interface Quincena {
  id: string
  household_id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  saldo_inicial: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Categoria {
  id: string
  household_id: string
  nombre: string
  tipo: 'gasto' | 'ingreso'
  presupuesto_default: number
  icono: string
  orden: number
  created_at: string
}

export interface PresupuestoQuincena {
  id: string
  quincena_id: string
  categoria_id: string
  monto_previsto: number
}

export interface Transaccion {
  id: string
  quincena_id: string
  categoria_id: string
  user_id: string
  household_id: string
  tipo: 'gasto' | 'ingreso'
  fecha: string
  importe: number
  descripcion: string | null
  created_at: string
}

// Joined view for display
export interface TransaccionConCategoria extends Transaccion {
  categorias: { nombre: string; icono: string } | null
  profiles: { display_name: string; color_hex: string } | null
}

export interface PresupuestoConCategoria extends PresupuestoQuincena {
  categorias: { nombre: string; icono: string; tipo: string } | null
}

export interface FinanceKPIs {
  saldoInicial: number
  totalIngresos: number
  totalGastos: number
  saldoActual: number
  porCategoria: {
    categoriaId: string
    nombre: string
    icono: string
    tipo: string
    previsto: number
    real: number
    porcentaje: number
  }[]
}

// =============================================
// CHORES
// =============================================

export type ChoreFrequency = 'diaria' | 'semanal' | 'quincenal' | 'mensual' | 'unica'
export type ChoreStatus = 'pending' | 'done' | 'skipped'

export interface ChoreTemplate {
  id: string
  household_id: string
  nombre: string
  descripcion: string | null
  icono: string
  frecuencia: ChoreFrequency
  puntos: number
  assigned_to: string | null
  notify_on_complete: boolean
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChoreInstance {
  id: string
  template_id: string
  household_id: string
  assigned_to: string | null
  due_date: string
  completed_at: string | null
  completed_by: string | null
  puntos_earned: number
  status: ChoreStatus
  nota: string | null
  created_at: string
}

export interface ChoreInstanceWithTemplate extends ChoreInstance {
  chore_templates: { nombre: string; icono: string; puntos: number; frecuencia: ChoreFrequency } | null
  profiles: { display_name: string; color_hex: string } | null
}

export interface RewardLog {
  id: string
  household_id: string
  user_id: string
  puntos: number
  razon: string
  created_at: string
}

export interface ChoreScoreboard {
  userId: string
  displayName: string
  colorHex: string
  totalPuntos: number
  completedCount: number
}
