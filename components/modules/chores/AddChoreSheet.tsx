'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createChoreTemplate } from '@/app/actions/chores/templates'

interface Member {
  id: string
  display_name: string
}

interface AddChoreSheetProps {
  open: boolean
  onClose: () => void
  members: Member[]
}

const FRECUENCIA_OPTIONS = [
  { value: 'diaria', label: 'Diaria' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'unica', label: 'Una vez' },
]

export function AddChoreSheet({ open, onClose, members }: AddChoreSheetProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const result = await createChoreTemplate(form)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva tarea del hogar">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">
            {error}
          </p>
        )}

        {/* Nombre */}
        <div className="space-y-1">
          <label htmlFor="nombre" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            placeholder="Lavar platos, barrer..."
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
          />
        </div>

        {/* Descripción */}
        <div className="space-y-1">
          <label htmlFor="descripcion" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Descripcion (opcional)
          </label>
          <input
            id="descripcion"
            name="descripcion"
            type="text"
            placeholder="Detalles adicionales..."
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
          />
        </div>

        {/* Frecuencia */}
        <div className="space-y-1">
          <label htmlFor="frecuencia" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Frecuencia
          </label>
          <select
            id="frecuencia"
            name="frecuencia"
            required
            className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
          >
            {FRECUENCIA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Puntos */}
        <div className="space-y-1">
          <label htmlFor="puntos" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Puntos
          </label>
          <input
            id="puntos"
            name="puntos"
            type="number"
            min="1"
            max="100"
            defaultValue="10"
            className="num w-24 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
          />
        </div>

        {/* Asignar a */}
        <div className="space-y-1">
          <label htmlFor="assigned_to" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Asignar a (opcional)
          </label>
          <select
            id="assigned_to"
            name="assigned_to"
            className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
          >
            <option value="">Sin asignar (ambos)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creando...' : 'Crear tarea'}
        </Button>
      </form>
    </BottomSheet>
  )
}
