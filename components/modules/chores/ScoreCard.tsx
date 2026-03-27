import { UserAvatar } from '@/components/ui/UserAvatar'

interface Player {
  name: string
  colorHex: string
  points: number
}

interface ScoreCardProps {
  players: [Player, Player]
  className?: string
}

export function ScoreCard({ players, className = '' }: ScoreCardProps) {
  const [a, b] = players
  const max = Math.max(a.points, b.points, 1)

  return (
    <div className={`rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">
        Puntuación
      </p>
      <div className="space-y-3">
        {players.map((p) => (
          <div key={p.name} className="flex items-center gap-3">
            <UserAvatar name={p.name} colorHex={p.colorHex} size="sm" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-1)]">{p.name}</span>
                <span className="num font-bold" style={{ color: p.colorHex }}>{p.points}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-sm transition-all duration-600 ease-out"
                  style={{
                    width: `${(p.points / max) * 100}%`,
                    backgroundColor: p.colorHex,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
