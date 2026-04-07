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

export type CategoriaType = 'gasto' | 'ingreso' | 'ahorro' | 'bolsillo' | 'credito'

export interface Categoria {
  id: string
  household_id: string
  nombre: string
  tipo: CategoriaType
  presupuesto_default: number
  icono: string
  orden: number
  assigned_to: string | null
  quincena_half: 1 | 2 | null
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
  tipo: 'gasto' | 'ingreso' | 'ahorro' | 'bolsillo' | 'credito'
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
  totalAhorros: number
  totalBolsillos: number
  totalCredito: number
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

// =============================================
// WORK TASKS (private)
// =============================================

export type TaskPriority = 'low' | 'mid' | 'high' | 'urgent'
export type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'cancelled'

export interface Subtask {
  text: string
  done: boolean
}

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly'

export interface WorkTask {
  id: string
  household_id: string
  user_id: string
  titulo: string
  descripcion: string | null
  prioridad: TaskPriority
  status: TaskStatus
  due_date: string | null
  due_time: string | null
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern | null
  recurrence_end: string | null
  tags: string[]
  subtasks: Subtask[]
  notify_on_due: boolean
  created_at: string
  updated_at: string
}

// =============================================
// MEDICAL (private)
// =============================================

export type MedicalRecordType = 'consulta' | 'examen' | 'vacuna' | 'control'

export interface MedicalRecord {
  id: string
  household_id: string
  user_id: string
  tipo: MedicalRecordType
  especialidad: string | null
  fecha: string
  proxima_cita: string | null
  doctor: string | null
  clinica: string | null
  notas: string | null
  archivos: string[]
  notify_days_before: number
  created_at: string
}

export interface Medicamento {
  id: string
  household_id: string
  user_id: string
  nombre: string
  dosis: string | null
  frecuencia: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  activo: boolean
  notas: string | null
  hora_inicio: string | null
  frecuencia_horas: number | null
  duracion_dias: number | null
  proxima_toma: string | null
  record_id: string | null
  created_at: string
}

// =============================================
// STUDIES
// =============================================

export type StudyCategory = 'curso' | 'libro' | 'certificacion' | 'idioma' | 'habilidad'
export type StudyGoalStatus = 'not_started' | 'in_progress' | 'completed' | 'paused'

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

export interface StudyGoal {
  id: string
  household_id: string
  user_id: string
  titulo: string
  descripcion: string | null
  categoria: StudyCategory
  plataforma: string | null
  url: string | null
  total_unidades: number
  unidades_completadas: number
  fecha_inicio: string | null
  fecha_meta: string | null
  horario: string | null
  dias_clase: DiaSemana[] | null
  status: StudyGoalStatus
  notify_on_milestone: boolean
  created_at: string
  updated_at: string
}

export interface StudySession {
  id: string
  goal_id: string
  user_id: string
  fecha: string
  minutos: number
  unidades_avanzadas: number
  nota: string | null
  created_at: string
}
