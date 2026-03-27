'use client'

import { useState } from 'react'
import { Home, Copy, Check, Bell, RefreshCw, Users } from 'lucide-react'
import { useHousehold } from '@/hooks/useHousehold'
import { updateHousehold } from '@/app/actions/core/households'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { UserAvatar } from '@/components/ui/UserAvatar'

export function HouseholdSettingsClient() {
  const { household, profile, members, loading } = useHousehold()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const isOwner = profile?.role === 'owner'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await updateHousehold(formData)

    if (result.ok) {
      setMessage({ type: 'ok', text: 'Hogar actualizado' })
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setSaving(false)
  }

  function handleCopyCode() {
    if (!household?.invite_code) return
    const link = `${window.location.origin}/join/${household.invite_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw size={20} className="animate-spin text-[var(--text-3)]" />
      </div>
    )
  }

  if (!household) {
    return (
      <div className="p-4">
        <p className="text-sm text-[var(--text-3)]">No se encontró el hogar.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-[var(--surface-2)]">
          <Home size={18} className="text-[var(--text-2)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-1)]">Hogar</h1>
          <p className="text-xs text-[var(--text-3)]">Configuración general del hogar</p>
        </div>
      </div>

      {/* Household form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="space-y-4">
            <Input
              label="Nombre del hogar"
              name="name"
              defaultValue={household.name}
              disabled={!isOwner}
              placeholder="Ej: Casa K&F"
            />

            <Input
              label="Discord Webhook URL"
              name="discord_webhook_url"
              defaultValue={household.discord_webhook_url ?? ''}
              disabled={!isOwner}
              placeholder="https://discord.com/api/webhooks/..."
              type="url"
            />

            <div className="flex items-start gap-2 rounded bg-[var(--surface-2)] p-3">
              <Bell size={14} className="mt-0.5 shrink-0 text-[var(--text-3)]" />
              <p className="text-xs text-[var(--text-3)]">
                Configura un webhook de Discord para recibir notificaciones de finanzas, tareas del hogar y más.
              </p>
            </div>
          </div>
        </Card>

        {isOwner && (
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        )}

        {!isOwner && (
          <p className="text-center text-xs text-[var(--text-3)]">
            Solo el owner puede editar la configuración del hogar.
          </p>
        )}

        {message && (
          <p className={`text-center text-xs ${message.type === 'ok' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {message.text}
          </p>
        )}
      </form>

      {/* Members */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[var(--text-3)]" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)]">
            Integrantes
          </p>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-3">
              <UserAvatar name={m.display_name} colorHex={m.color_hex} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-1)]">{m.display_name}</p>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)]">{m.role === 'owner' ? 'Administrador' : 'Miembro'}</p>
              </div>
              {m.id === profile?.id && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--mod-finance)]">Tu</span>
              )}
            </div>
          ))}
          {members.length < 2 && (
            <p className="text-xs text-[var(--text-3)]">Invita a tu pareja usando el enlace de abajo.</p>
          )}
        </div>
      </Card>

      {/* Invite code */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)]">
          Código de invitación
        </p>
        <div className="mt-3 flex items-center gap-3">
          <p className="font-mono text-lg font-bold text-[var(--text-1)]">
            {household.invite_code}
          </p>
          <button
            onClick={handleCopyCode}
            className="flex h-8 w-8 items-center justify-center rounded bg-[var(--surface-2)] text-[var(--text-2)] transition-colors hover:bg-[var(--border)]"
            type="button"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <p className="mt-1 break-all text-xs text-[var(--text-3)]">
          {typeof window !== 'undefined' && `${window.location.origin}/join/${household.invite_code}`}
        </p>
        <p className="mt-2 text-xs text-[var(--text-3)]">
          Copia el enlace completo para que tu pareja se una al hogar.
        </p>
      </Card>
    </div>
  )
}
