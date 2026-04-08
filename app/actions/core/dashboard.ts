'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveQuincena } from '@/app/actions/finance/quincenas'
import { getFinanceKPIs } from '@/app/actions/finance/dashboard'
import type { FinanceKPIs } from '@/lib/types/modules.types'

interface DashboardMetrics {
  choresPending: number
  choresDone: number
  studyStreak: number
  activeMeds: number
  nextMed: { nombre: string; proxima_toma: string } | null
  openTasks: number
  urgentTasks: number
  tasksDueToday: number
  activeGoals: number
  finance: FinanceKPIs | null
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {
    choresPending: 0, choresDone: 0, studyStreak: 0,
    activeMeds: 0, nextMed: null, openTasks: 0, urgentTasks: 0,
    tasksDueToday: 0, activeGoals: 0, finance: null,
  }

  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).toISOString().split('T')[0]

  // Parallel queries for speed
  const [choresRes, choresDoneRes, medsRes, tasksRes, urgentRes, dueTodayRes, streakRes, goalsRes, quincenaRes] = await Promise.all([
    // Pending chores for today
    supabase
      .from('chore_instances')
      .select('id', { count: 'exact', head: true })
      .eq('fecha', today)
      .eq('status', 'pending'),

    // Done chores today
    supabase
      .from('chore_instances')
      .select('id', { count: 'exact', head: true })
      .eq('fecha', today)
      .eq('status', 'done'),

    // Active medications with next dose
    supabase
      .from('medicamentos')
      .select('nombre, proxima_toma')
      .eq('user_id', user.id)
      .eq('activo', true)
      .order('proxima_toma', { ascending: true }),

    // Open work tasks
    supabase
      .from('work_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['backlog', 'in_progress']),

    // Urgent/high priority tasks
    supabase
      .from('work_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['backlog', 'in_progress'])
      .in('prioridad', ['high', 'urgent']),

    // Tasks due today
    supabase
      .from('work_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['backlog', 'in_progress'])
      .eq('due_date', today),

    // Study streak
    supabase
      .from('study_sessions')
      .select('fecha')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(60),

    // Active study goals
    supabase
      .from('study_goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'in_progress'),

    // Finance
    getActiveQuincena(),
  ])

  // Calculate streak
  let streak = 0
  if (streakRes.data?.length) {
    const dates = [...new Set(streakRes.data.map((s) => s.fecha))].sort().reverse()
    const now = new Date()
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (dates[0] !== checkDate.toISOString().split('T')[0]) {
      checkDate.setDate(checkDate.getDate() - 1)
    }

    for (const d of dates) {
      if (d === checkDate.toISOString().split('T')[0]) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  // Finance KPIs
  let finance: FinanceKPIs | null = null
  if (quincenaRes.ok && quincenaRes.data) {
    const kpiRes = await getFinanceKPIs(quincenaRes.data.id)
    if (kpiRes.ok) finance = kpiRes.data
  }

  // Next medication
  const meds = medsRes.data ?? []
  const nextMed = meds.length > 0 ? { nombre: meds[0].nombre, proxima_toma: meds[0].proxima_toma } : null

  return {
    choresPending: choresRes.count ?? 0,
    choresDone: choresDoneRes.count ?? 0,
    activeMeds: meds.length,
    nextMed,
    openTasks: tasksRes.count ?? 0,
    urgentTasks: urgentRes.count ?? 0,
    tasksDueToday: dueTodayRes.count ?? 0,
    studyStreak: streak,
    activeGoals: goalsRes.count ?? 0,
    finance,
  }
}
