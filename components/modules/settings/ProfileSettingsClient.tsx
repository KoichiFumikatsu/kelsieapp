'use client'

import { useState } from 'react'
import { User, RefreshCw, Palette } from 'lucide-react'
import { useHousehold } from '@/hooks/useHousehold'
import { updateProfile } from '@/app/actions/core/profile'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { UserAvatar } from '@/components/ui/UserAvatar'

const COLOR_PRESETS = [
  '#6C63FF', '#FF6B6B', '#4ECDC4', '#FFD93D',
  '#FF8A5C', '#A8E6CF', '#DDA0DD', '#87CEEB',
]

export function ProfileSettingsClient() {
  const { profile, loading } = useHousehold()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  const currentColor = selectedColor ?? profile?.color_hex ?? '#6C63FF'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    formData.set('color_hex', currentColor)

    const result = await updateProfile(formData)

    if (result.ok) {
      setMessage({ type: 'ok', text: 'Perfil actualizado' })
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw size={20} className="animate-spin text-[var(--text-3)]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-4">
        <p className="text-sm text-[var(--text-3)]">No se encontró el perfil.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-[var(--surface-2)]">
          <User size={18} className="text-[var(--text-2)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-1)]">Perfil</h1>
          <p className="text-xs text-[var(--text-3)]">Tu información personal</p>
        </div>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center">
        <UserAvatar
          name={profile.display_name}
          colorHex={currentColor}
          size="lg"
        />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="space-y-4">
            <Input
              label="Nombre"
              name="display_name"
              defaultValue={profile.display_name}
              placeholder="Tu nombre"
            />

            {/* Color picker */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-[var(--text-3)]" />
                <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
                  Color
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: currentColor === color ? 'var(--text-1)' : 'transparent',
                    }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-[var(--border-strong)] bg-transparent"
              />
            </div>

            <div className="rounded bg-[var(--surface-2)] p-3">
              <p className="text-xs text-[var(--text-3)]">
                <span className="font-semibold text-[var(--text-2)]">Rol:</span>{' '}
                {profile.role === 'owner' ? 'Owner' : 'Miembro'}
              </p>
            </div>
          </div>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>

        {message && (
          <p className={`text-center text-xs ${message.type === 'ok' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  )
}
