'use client'

import { useState } from 'react'
import { BottomSheet } from './Modal'

interface ConfirmSheetProps {
  label: string
  onConfirm: () => Promise<void>
  onClose: () => void
  confirmLabel?: string
  title?: string
}

export function ConfirmSheet({
  label,
  onConfirm,
  onClose,
  confirmLabel = 'Eliminar',
  title = 'Confirmar eliminación',
}: ConfirmSheetProps) {
  const [pending, setPending] = useState(false)

  async function handle() {
    setPending(true)
    await onConfirm()
    onClose()
  }

  return (
    <BottomSheet open onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: '.88em', color: 'var(--t2)', lineHeight: 1.5 }}>{label}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={{
              flex: 1, padding: 13, borderRadius: 'var(--rm)',
              border: '1px solid var(--b1)', background: 'var(--s2)',
              fontSize: '.88em', fontWeight: 800, color: 'var(--t2)', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handle}
            disabled={pending}
            style={{
              flex: 1, padding: 13, borderRadius: 'var(--rm)', border: 'none',
              background: pending ? 'var(--s3)' : 'var(--r)',
              fontSize: '.88em', fontWeight: 900,
              color: pending ? 'var(--t3)' : '#fff',
              textTransform: 'uppercase', letterSpacing: '.06em',
              cursor: pending ? 'default' : 'pointer',
              transition: 'background .15s, color .15s',
            }}
          >
            {pending ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
