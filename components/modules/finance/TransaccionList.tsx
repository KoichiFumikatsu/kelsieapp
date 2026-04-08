'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCOP, formatDateShort } from '@/lib/utils/format'
import { UserAvatar } from '@/components/ui/UserAvatar'
import type { TransaccionConCategoria } from '@/lib/types/modules.types'

interface TransaccionListProps {
  transacciones: TransaccionConCategoria[]
  onEdit?: (t: TransaccionConCategoria) => void
  className?: string
  pageSize?: number
}

export function TransaccionList({ transacciones, onEdit, className = '', pageSize }: TransaccionListProps) {
  const [page, setPage] = useState(0)
  const totalPages = pageSize ? Math.max(1, Math.ceil(transacciones.length / pageSize)) : 1
  const safePage = Math.min(page, totalPages - 1)
  const visible = pageSize ? transacciones.slice(safePage * pageSize, (safePage + 1) * pageSize) : transacciones

  useEffect(() => { setPage(0) }, [transacciones.length])
  if (transacciones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-3)]">
        Sin transacciones aun
      </p>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {visible.map((t) => {
        const colorMap: Record<string, string> = {
          gasto: 'var(--expense)',
          ingreso: 'var(--income)',
          ahorro: 'var(--info)',
          bolsillo: 'var(--mod-finance)',
        }
        const signMap: Record<string, string> = {
          gasto: '\u2212',
          ingreso: '+',
          ahorro: '\u2212',
          bolsillo: '\u2212',
        }
        const color = colorMap[t.tipo] ?? 'var(--text-1)'
        const sign = signMap[t.tipo] ?? ''

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onEdit?.(t)}
            className="flex w-full items-center gap-3 rounded px-2 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
          >
            {/* User avatar */}
            <UserAvatar
              name={t.profiles?.display_name ?? '?'}
              colorHex={t.profiles?.color_hex ?? '#141413'}
              size="sm"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-1)]">
                {t.descripcion || t.categorias?.nombre || 'Transaccion'}
              </p>
              <p className="text-[10px] text-[var(--text-3)]">
                {t.categorias?.nombre} \u00b7 {formatDateShort(t.fecha)}
              </p>
            </div>

            {/* Amount */}
            <span
              className="num shrink-0 text-sm font-bold"
              style={{ color }}
            >
              {sign}{formatCOP(t.importe)}
            </span>
          </button>
        )
      })}
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded p-1 text-[var(--text-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="num text-xs text-[var(--text-3)]">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded p-1 text-[var(--text-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
