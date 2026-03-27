'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Module = 'finance' | 'chores' | 'tasks' | 'medical' | 'studies'
type Action = 'view' | 'edit' | 'delete' | 'manage'

interface Permission {
  module: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_manage: boolean
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('module_permissions')
        .select('module, can_view, can_edit, can_delete, can_manage')
        .eq('user_id', user.id)

      if (data) setPermissions(data)
      setLoading(false)
    }

    load()
  }, [])

  const can = useCallback((module: Module, action: Action): boolean => {
    const perm = permissions.find((p) => p.module === module)
    if (!perm) return false

    const actionMap: Record<Action, keyof Permission> = {
      view: 'can_view',
      edit: 'can_edit',
      delete: 'can_delete',
      manage: 'can_manage',
    }

    return perm[actionMap[action]] as boolean
  }, [permissions])

  return { can, permissions, loading }
}
