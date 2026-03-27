'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function InviteLinkCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const link = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mod-card p-4" style={{ '--accent': 'var(--mod-chores)' } as React.CSSProperties}>
      <p className="text-xs font-medium uppercase tracking-widest text-muted">
        Enlace de invitacion
      </p>
      <div className="mt-2 flex items-center gap-2">
        <p className="font-mono text-sm font-bold text-primary break-all">
          {typeof window !== 'undefined' && `${window.location.origin}/join/${code}`}
        </p>
        <button
          onClick={handleCopy}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] text-[var(--text-2)] transition-colors hover:bg-[var(--border)]"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Copia y envia este enlace a tu pareja para que se una al hogar.
      </p>
    </div>
  )
}
