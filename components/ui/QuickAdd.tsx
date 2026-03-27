'use client'

import { useRef, type FormEvent } from 'react'
import { Plus } from 'lucide-react'

interface QuickAddProps {
  placeholder?: string
  onAdd: (value: string) => void
  disabled?: boolean
  className?: string
}

export function QuickAdd({ placeholder = 'Agregar...', onAdd, disabled, className = '' }: QuickAddProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const val = inputRef.current?.value.trim()
    if (!val) return
    onAdd(val)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--text-1)]"
      />
      <button
        type="submit"
        disabled={disabled}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[var(--text-1)] text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-40"
        aria-label="Agregar"
      >
        <Plus size={16} strokeWidth={2} />
      </button>
    </form>
  )
}
