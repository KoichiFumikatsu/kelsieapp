import { formatCOP, formatDateShort } from '@/lib/utils/format'
import { UserAvatar } from '@/components/ui/UserAvatar'
import type { TransaccionConCategoria } from '@/lib/types/modules.types'

interface TransaccionListProps {
  transacciones: TransaccionConCategoria[]
  className?: string
}

export function TransaccionList({ transacciones, className = '' }: TransaccionListProps) {
  if (transacciones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-3)]">
        Sin transacciones aún
      </p>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {transacciones.map((t) => {
        const colorMap: Record<string, string> = {
          gasto: 'var(--expense)',
          ingreso: 'var(--income)',
          ahorro: 'var(--info)',
          bolsillo: 'var(--mod-finance)',
        }
        const signMap: Record<string, string> = {
          gasto: '−',
          ingreso: '+',
          ahorro: '−',
          bolsillo: '−',
        }
        const color = colorMap[t.tipo] ?? 'var(--text-1)'
        const sign = signMap[t.tipo] ?? ''

        return (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded px-2 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
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
                {t.descripcion || t.categorias?.nombre || 'Transacción'}
              </p>
              <p className="text-[10px] text-[var(--text-3)]">
                {t.categorias?.nombre} · {formatDateShort(t.fecha)}
              </p>
            </div>

            {/* Amount */}
            <span
              className="num shrink-0 text-sm font-bold"
              style={{ color }}
            >
              {sign}{formatCOP(t.importe)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
