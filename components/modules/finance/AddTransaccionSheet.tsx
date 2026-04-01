'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createTransaccion } from '@/app/actions/finance/transacciones'
import type { Categoria } from '@/lib/types/modules.types'

interface Member {
  id: string
  display_name: string
  color_hex: string
}

interface AddTransaccionSheetProps {
  open: boolean
  onClose: () => void
  quincenaId: string
  categorias: Categoria[]
  members: Member[]
  currentUserId?: string
}

export function AddTransaccionSheet({ open, onClose, quincenaId, categorias, members, currentUserId }: AddTransaccionSheetProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    form.set('quincena_id', quincenaId)

    const result = await createTransaccion(form)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    onClose()
  }

  const gastos = categorias.filter((c) => c.tipo === 'gasto')
  const ingresos = categorias.filter((c) => c.tipo === 'ingreso')
  const ahorros = categorias.filter((c) => c.tipo === 'ahorro')
  const bolsillos = categorias.filter((c) => c.tipo === 'bolsillo')

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva transacción">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">
            {error}
          </p>
        )}

        {/* Tipo */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-[var(--border-strong)] px-3 py-2 text-sm font-medium has-[:checked]:border-[var(--expense)] has-[:checked]:bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] has-[:checked]:text-[var(--expense)]">
              <input type="radio" name="tipo" value="gasto" defaultChecked className="sr-only" />
              Gasto
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-[var(--border-strong)] px-3 py-2 text-sm font-medium has-[:checked]:border-[var(--income)] has-[:checked]:bg-[color-mix(in_srgb,var(--income)_8%,transparent)] has-[:checked]:text-[var(--income)]">
              <input type="radio" name="tipo" value="ingreso" className="sr-only" />
              Ingreso
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-[var(--border-strong)] px-3 py-2 text-sm font-medium has-[:checked]:border-[var(--info)] has-[:checked]:bg-[color-mix(in_srgb,var(--info)_8%,transparent)] has-[:checked]:text-[var(--info)]">
              <input type="radio" name="tipo" value="ahorro" className="sr-only" />
              Ahorro
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-[var(--border-strong)] px-3 py-2 text-sm font-medium has-[:checked]:border-[var(--mod-finance)] has-[:checked]:bg-[color-mix(in_srgb,var(--mod-finance)_8%,transparent)] has-[:checked]:text-[var(--mod-finance)]">
              <input type="radio" name="tipo" value="bolsillo" className="sr-only" />
              Bolsillo
            </label>
          </div>
        </div>

        {/* Importe */}
        <div className="space-y-1">
          <label htmlFor="importe" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Importe
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[var(--text-3)]">$</span>
            <input
              id="importe"
              name="importe"
              type="number"
              min="1"
              required
              placeholder="0"
              className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
            />
          </div>
        </div>

        {/* Miembro */}
        {members.length > 1 && (
          <div className="space-y-1">
            <label htmlFor="user_id" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
              Miembro
            </label>
            <select
              id="user_id"
              name="user_id"
              defaultValue={currentUserId}
              className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Categoría */}
        <div className="space-y-1">
          <label htmlFor="categoria_id" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Categoría
          </label>
          <select
            id="categoria_id"
            name="categoria_id"
            required
            className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
          >
            {gastos.length > 0 && (
              <optgroup label="Gastos">
                {gastos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </optgroup>
            )}
            {ingresos.length > 0 && (
              <optgroup label="Ingresos">
                {ingresos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </optgroup>
            )}
            {ahorros.length > 0 && (
              <optgroup label="Ahorros">
                {ahorros.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </optgroup>
            )}
            {bolsillos.length > 0 && (
              <optgroup label="Bolsillos">
                {bolsillos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Descripción */}
        <div className="space-y-1">
          <label htmlFor="descripcion" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Descripción
          </label>
          <input
            id="descripcion"
            name="descripcion"
            type="text"
            placeholder="Opcional"
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text-3)] focus:border-[var(--text-1)]"
          />
        </div>

        {/* Fecha */}
        <div className="space-y-1">
          <label htmlFor="fecha" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]"
          />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Guardando...' : 'Registrar'}
        </Button>
      </form>
    </BottomSheet>
  )
}
