'use server'

import { createClient } from '@/lib/supabase/server'

interface DashboardMetrics {
  choresPending: number
  studyStreak: number
  activeMeds: number
  openTasks: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { choresPending: 0, studyStreak: 0, activeMeds: 0, openTasks: 0 }

  const today = new Date().toISOString().split('T')[0]

  // Parallel queries for speed
  const [choresRes, medsRes, tasksRes, streakRes] = await Promise.all([
    // Pending chores for today
    supabase
      .from('chore_instances')
      .select('id', { count: 'exact', head: true })
      .eq('fecha', today)
      .eq('status', 'pending'),

    // Active medications (user's own)
    supabase
      .from('medicamentos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('activo', true),

    // Open work tasks (user's own, in_progress + backlog)
    supabase
      .from('work_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['backlog', 'in_progress']),

    // Study streak — count consecutive days with sessions
    supabase
      .from('study_sessions')
      .select('fecha')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(60),
  ])

  // Calculate streak
  let streak = 0
  if (streakRes.data?.length) {
    const dates = [...new Set(streakRes.data.map((s) => s.fecha))].sort().reverse()
    const now = new Date()
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // If no session today, start from yesterday
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

  return {
    choresPending: choresRes.count ?? 0,
    activeMeds: medsRes.count ?? 0,
    openTasks: tasksRes.count ?? 0,
    studyStreak: streak,
  }
}
