'use client'

import { useState } from 'react'

const MODULES = ['finance', 'chores', 'tasks', 'medical', 'studies'] as const
const ACTIONS = ['can_view', 'can_edit', 'can_delete', 'can_manage'] as const

const MODULE_LABELS: Record<string, string> = {
  finance: 'Finanzas',
  chores:  'Tareas hogar',
  tasks:   'Trabajo',
  medical: 'Salud',
  studies: 'Estudio',
}

const ACTION_LABELS: Record<string, string> = {
  can_view:   'Ver',
  can_edit:   'Editar',
  can_delete: 'Eliminar',
  can_manage: 'Admin',
}

export type PermRow = {
  module: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_manage: boolean
}

interface PermissionsGridProps {
  permissions: PermRow[]
  onChange?: (module: string, action: string, value: boolean) => void
  disabled?: boolean
  className?: string
}

export function PermissionsGrid({ permissions, onChange, disabled, className = '' }: PermissionsGridProps) {
  const permMap = Object.fromEntries(permissions.map((p) => [p.module, p]))

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border-strong)]">
            <th className="py-2 pr-4 text-left font-semibold uppercase tracking-widest text-[var(--text-3)]">
              Módulo
            </th>
            {ACTIONS.map((a) => (
              <th key={a} className="px-2 py-2 text-center font-semibold uppercase tracking-widest text-[var(--text-3)]">
                {ACTION_LABELS[a]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod) => {
            const row = permMap[mod]
            return (
              <tr key={mod} className="border-b border-[var(--border)]">
                <td className="py-2.5 pr-4 font-medium text-[var(--text-1)]">
                  {MODULE_LABELS[mod]}
                </td>
                {ACTIONS.map((action) => (
                  <td key={action} className="px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={row ? row[action] : false}
                      disabled={disabled}
                      onChange={(e) => onChange?.(mod, action, e.target.checked)}
                      className="h-4 w-4 accent-[var(--text-1)]"
                    />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
