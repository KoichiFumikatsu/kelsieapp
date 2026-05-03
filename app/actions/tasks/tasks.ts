'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, WorkTask, TaskStatus, TaskCategoria, Subtask } from '@/lib/types/modules.types'

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()
  return { supabase, userId: user.id, householdId: profile?.household_id as string | null }
}

export async function getAllWorkTasks(): Promise<ActionResult<WorkTask[]>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await ctx.supabase
    .from('work_tasks')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as WorkTask[] }
}

export async function createWorkTask(formData: FormData): Promise<ActionResult<WorkTask>> {
  const ctx = await getCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const titulo = formData.get('titulo') as string
  const descripcion = (formData.get('descripcion') as string) || null
  const prioridad = (formData.get('prioridad') as string) || 'mid'
  const categoria = ((formData.get('categoria') as string) || 'trabajo') as TaskCategoria
  const dueDate = (formData.get('due_date') as string) || null
  const dueTime = (formData.get('due_time') as string) || null
  const isRecurring = formData.get('is_recurring') === 'on'
  const recurrencePattern = isRecurring ? ((formData.get('recurrence_pattern') as string) || null) : null
  const recurrenceEnd = isRecurring ? ((formData.get('recurrence_end') as string) || null) : null
  const tagsRaw = (formData.get('tags') as string) || ''
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
  const subtasksRaw = (formData.get('subtasks') as string) || '[]'
  let subtasks: Subtask[] = []
  try { subtasks = JSON.parse(subtasksRaw) } catch { /* ignore */ }

  if (!titulo) return { ok: false, error: 'El titulo es requerido' }

  const { data, error } = await ctx.supabase
    .from('work_tasks')
    .insert({
      household_id: ctx.householdId,
      user_id: ctx.userId,
      titulo,
      descripcion,
      prioridad,
      categoria,
      due_date: dueDate || null,
      due_time: dueTime || null,
      is_recurring: isRecurring,
      recurrence_pattern: recurrencePattern,
      recurrence_end: recurrenceEnd || null,
      tags,
      subtasks,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as WorkTask }
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<ActionResult<WorkTask>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const { data, error } = await ctx.supabase
    .from('work_tasks')
    .update({ status })
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as WorkTask }
}

export async function updateWorkTask(id: string, formData: FormData): Promise<ActionResult<WorkTask>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const titulo = formData.get('titulo') as string
  const descripcion = (formData.get('descripcion') as string) || null
  const prioridad = (formData.get('prioridad') as string) || 'mid'
  const categoria = ((formData.get('categoria') as string) || 'trabajo') as TaskCategoria
  const dueDate = (formData.get('due_date') as string) || null
  const dueTime = (formData.get('due_time') as string) || null
  const isRecurring = formData.get('is_recurring') === 'on'
  const recurrencePattern = isRecurring ? ((formData.get('recurrence_pattern') as string) || null) : null
  const recurrenceEnd = isRecurring ? ((formData.get('recurrence_end') as string) || null) : null
  const tagsRaw = (formData.get('tags') as string) || ''
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
  const subtasksRaw = (formData.get('subtasks') as string) || '[]'
  let subtasks: Subtask[] = []
  try { subtasks = JSON.parse(subtasksRaw) } catch { /* ignore */ }

  const { data, error } = await ctx.supabase
    .from('work_tasks')
    .update({ titulo, descripcion, prioridad, categoria, due_date: dueDate || null, due_time: dueTime || null, is_recurring: isRecurring, recurrence_pattern: recurrencePattern, recurrence_end: recurrenceEnd || null, tags, subtasks })
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as WorkTask }
}

export async function deleteWorkTask(id: string): Promise<ActionResult<null>> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  const { error } = await ctx.supabase
    .from('work_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
