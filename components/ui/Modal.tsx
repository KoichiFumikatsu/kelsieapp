'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

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
      className="m-auto w-full max-w-[400px] p-0 shadow-xl backdrop:bg-black/60"
      style={{
        background: 'var(--s1)',
        border: '1px solid var(--b1)',
        borderRadius: 'var(--rl)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--b1)' }}
      >
        {title && (
          <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--t1)', letterSpacing: '.12em' }}>
            {title}
          </h2>
        )}
        <button
          onClick={onClose}
          className="icon-btn ml-auto"
          aria-label="Cerrar"
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  )
}

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const startY = useRef(0)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { startY.current = e.touches[0].clientY }}
        onTouchEnd={(e) => { if (e.changedTouches[0].clientY - startY.current > 80) onClose() }}
        className="w-full max-w-[430px] animate-slide-up md:animate-fade-in"
        style={{
          background: 'var(--s1)',
          border: '1px solid var(--b1)',
          borderBottom: 'none',
          borderRadius: 'var(--rl) var(--rl) 0 0',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full" style={{ background: 'var(--b2)' }} />
        </div>
        {title && (
          <div className="px-4 pb-3" style={{ borderBottom: '1px solid var(--b1)' }}>
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--t1)', letterSpacing: '.12em' }}>
              {title}
            </h2>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-6 pt-3">{children}</div>
      </div>
    </div>
  )
}
