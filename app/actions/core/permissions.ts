'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/modules.types'

type Module = 'finance' | 'chores' | 'tasks' | 'medical' | 'studies'
type Action = 'view' | 'edit' | 'delete' | 'manage'

export async function getUserPermissions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado' }

  const { data: permissions, error } = await supabase
    .from('module_permissions')
    .select('module, can_view, can_edit, can_delete, can_manage')
    .eq('user_id', user.id)

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, data: permissions }
}

export async function checkPermission(module: Module, action: Action): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const columnMap: Record<Action, string> = {
    view: 'can_view',
    edit: 'can_edit',
    delete: 'can_delete',
    manage: 'can_manage',
  }

  const { data } = await supabase
    .from('module_permissions')
    .select(columnMap[action])
    .eq('user_id', user.id)
    .eq('module', module)
    .single()

  if (!data) return false
  return data[columnMap[action] as keyof typeof data] as boolean
}

export async function updatePermission(
  userId: string,
  module: Module,
  action: Action,
  value: boolean
): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  // Verificar que el usuario actual es owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, household_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    return { ok: false, error: 'Solo el owner puede cambiar permisos' }
  }

  const columnMap: Record<Action, string> = {
    view: 'can_view',
    edit: 'can_edit',
    delete: 'can_delete',
    manage: 'can_manage',
  }

  const { error } = await supabase
    .from('module_permissions')
    .update({ [columnMap[action]]: value })
    .eq('user_id', userId)
    .eq('module', module)
    .eq('household_id', profile.household_id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}
