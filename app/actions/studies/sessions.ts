'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, StudySession } from '@/lib/types/modules.types'

export async function getStudySessions(goalId: string): Promise<ActionResult<StudySession[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('goal_id', goalId)
    .order('fecha', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as StudySession[] }
}

export async function createStudySession(formData: FormData): Promise<ActionResult<StudySession>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const goalId = formData.get('goal_id') as string
  const minutos = Number(formData.get('minutos'))
  const unidadesAvanzadas = Number(formData.get('unidades_avanzadas')) || 0
  const nota = (formData.get('nota') as string) || null

  if (!goalId || !minutos || minutos <= 0) {
    return { ok: false, error: 'Meta y minutos son requeridos' }
  }

  // Insert session
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      goal_id: goalId,
      user_id: user.id,
      minutos,
      unidades_avanzadas: unidadesAvanzadas,
      nota,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  // Update goal progress
  if (unidadesAvanzadas > 0) {
    const { data: goal } = await supabase
      .from('study_goals')
      .select('unidades_completadas, total_unidades, status')
      .eq('id', goalId)
      .single()

    if (goal) {
      const newCompleted = goal.unidades_completadas + unidadesAvanzadas
      const newStatus = newCompleted >= goal.total_unidades ? 'completed' :
        goal.status === 'not_started' ? 'in_progress' : goal.status

      await supabase
        .from('study_goals')
        .update({
          unidades_completadas: Math.min(newCompleted, goal.total_unidades),
          status: newStatus,
        })
        .eq('id', goalId)
    }
  } else {
    // At least mark as in_progress if it was not_started
    await supabase
      .from('study_goals')
      .update({ status: 'in_progress' })
      .eq('id', goalId)
      .eq('status', 'not_started')
  }

  return { ok: true, data: data as StudySession }
}

export async function getStudyStreak(userId?: string): Promise<ActionResult<number>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const uid = userId ?? user.id

  // Get all unique study dates, ordered descending
  const { data, error } = await supabase
    .from('study_sessions')
    .select('fecha')
    .eq('user_id', uid)
    .order('fecha', { ascending: false })

  if (error) return { ok: false, error: error.message }
  if (!data || data.length === 0) return { ok: true, data: 0 }

  // Deduplicate dates
  const uniqueDates = [...new Set(data.map((d) => d.fecha))]

  // Count consecutive days from today
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = new Date(today)
    expectedDate.setDate(today.getDate() - i)
    const expected = expectedDate.toISOString().split('T')[0]

    if (uniqueDates[i] === expected) {
      streak++
    } else {
      break
    }
  }

  return { ok: true, data: streak }
}
