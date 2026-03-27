'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, RefreshCw } from 'lucide-react'
import { useHousehold } from '@/hooks/useHousehold'
import { getUserPermissions, updatePermission } from '@/app/actions/core/permissions'
import { PermissionsGrid, type PermRow } from '@/components/modules/settings/PermissionsGrid'
import { Card } from '@/components/ui/Card'

export function PermissionsSettingsClient() {
  const { profile, members, loading: householdLoading } = useHousehold()
  const [permissions, setPermissions] = useState<Record<string, PermRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const isOwner = profile?.role === 'owner'

  const loadPermissions = useCallback(async () => {
    if (!members.length) return

    // For now, load current user's permissions
    // Owner can see all members' permissions
    const result = await getUserPermissions()
    if (result.ok) {
      // Group by user — getUserPermissions returns current user's perms
      setPermissions({ [profile?.id ?? '']: result.data as PermRow[] })
    }
    setLoading(false)
  }, [members, profile?.id])

  useEffect(() => {
    if (!householdLoading) loadPermissions()
  }, [householdLoading, loadPermissions])

  async function handleChange(userId: string, module: string, action: string, value: boolean) {
    if (!isOwner) return
    setSaving(true)
    setMessage(null)

    const actionKey = action.replace('can_', '') as 'view' | 'edit' | 'delete' | 'manage'
    const result = await updatePermission(userId, module as 'finance' | 'chores' | 'tasks' | 'medical' | 'studies', actionKey, value)

    if (result.ok) {
      // Update local state
      setPermissions((prev) => {
        const userPerms = [...(prev[userId] ?? [])]
        const idx = userPerms.findIndex((p) => p.module === module)
        if (idx >= 0) {
          userPerms[idx] = { ...userPerms[idx], [action]: value }
        }
        return { ...prev, [userId]: userPerms }
      })
      setMessage({ type: 'ok', text: 'Permiso actualizado' })
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setSaving(false)
  }

  if (householdLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw size={20} className="animate-spin text-[var(--text-3)]" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-[var(--surface-2)]">
          <Shield size={18} className="text-[var(--text-2)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-1)]">Permisos</h1>
          <p className="text-xs text-[var(--text-3)]">Control de acceso por módulo</p>
        </div>
      </div>

      {/* Permissions per member */}
      {members.map((member) => (
        <Card key={member.id}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: member.color_hex }}
              >
                {member.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-1)]">{member.display_name}</p>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)]">
                  {member.role === 'owner' ? 'Owner' : 'Miembro'}
                </p>
              </div>
            </div>

            <PermissionsGrid
              permissions={permissions[member.id] ?? []}
              onChange={(module, action, value) => handleChange(member.id, module, action, value)}
              disabled={!isOwner || saving}
            />
          </div>
        </Card>
      ))}

      {!isOwner && (
        <p className="text-center text-xs text-[var(--text-3)]">
          Solo el owner puede cambiar los permisos.
        </p>
      )}

      {message && (
        <p className={`text-center text-xs ${message.type === 'ok' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
