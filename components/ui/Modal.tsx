'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/* ── Modal — HSR-style frosted overlay ── */
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-[400px] rounded-md border border-[var(--border)] bg-[var(--surface)] p-0 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        {title && (
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-1)]">
            {title}
          </h2>
        )}
        <button
          onClick={onClose}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded text-[var(--text-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
          aria-label="Cerrar"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>
      {/* Body */}
      <div className="p-4">{children}</div>
    </dialog>
  )
}

/* ── BottomSheet — drag-to-close mobile panel ── */
interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - startY.current
    if (delta > 80) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full max-w-[430px] animate-slide-up rounded-t-lg border border-b-0 border-[var(--border)] bg-[var(--surface)] md:rounded-lg md:border-b"
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-[var(--text-3)] opacity-40" />
        </div>
        {title && (
          <div className="px-4 pb-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-1)]">
              {title}
            </h2>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}
