'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/Modal'
import { createTransaccion } from '@/app/actions/finance/transacciones'
import type { Categoria } from '@/lib/types/modules.types'

interface Member {
  id: string
  display_name: string
  color_hex: string
}

interface Props {
  open: boolean
  onClose: () => void
  quincenaId: string
  categorias: Categoria[]
  members: Member[]
  currentUserId?: string
  fecha: string
  onFechaChange: (f: string) => void
}

type TipoTx =
  | 'gasto' | 'ingreso'
  | 'credito' | 'pago_credito'
  | 'ahorro' | 'retiro_ahorro'
  | 'bolsillo' | 'uso_bolsillo'

type MainGroup = 'gasto' | 'ingreso' | 'credito' | 'ahorro' | 'bolsillo'

const MAIN_GROUPS: { value: MainGroup; label: string; icon: string; color: string; bg: string }[] = [
  { value: 'gasto',    label: 'Gasto',    icon: '▽', color: 'var(--r)',  bg: 'var(--r0)'  },
  { value: 'ingreso',  label: 'Ingreso',  icon: '△', color: 'var(--g)',  bg: 'var(--g0)'  },
  { value: 'credito',  label: 'Crédito',  icon: '▣', color: 'var(--pu)', bg: 'var(--p0)'  },
  { value: 'ahorro',   label: 'Ahorro',   icon: '⊙', color: 'var(--y)',  bg: 'var(--y0)'  },
  { value: 'bolsillo', label: 'Bolsillo', icon: '◧', color: 'var(--bl)', bg: 'var(--b0c)' },
]

type Direction = 'in' | 'out'

const DIRECTIONS: Record<MainGroup, { in: { label: string; tipo: TipoTx }; out: { label: string; tipo: TipoTx } } | null> = {
  gasto:    null,
  ingreso:  null,
  credito:  { in: { label: 'Cargo TC',   tipo: 'credito'       }, out: { label: 'Pagar TC',    tipo: 'pago_credito'  } },
  ahorro:   { in: { label: 'Depositar',  tipo: 'ahorro'        }, out: { label: 'Retirar',     tipo: 'retiro_ahorro' } },
  bolsillo: { in: { label: 'Depositar',  tipo: 'bolsillo'      }, out: { label: 'Usar',        tipo: 'uso_bolsillo'  } },
}

function resolvedTipo(group: MainGroup, dir: Direction): TipoTx {
  const dirs = DIRECTIONS[group]
  if (!dirs) return group as TipoTx
  return dir === 'in' ? dirs.in.tipo : dirs.out.tipo
}

export function AddTransaccionSheet({ open, onClose, quincenaId, categorias, members, currentUserId, fecha, onFechaChange }: Props) {
  const [group, setGroup]       = useState<MainGroup>('gasto')
  const [dir, setDir]           = useState<Direction>('in')
  const [userId, setUserId]     = useState(currentUserId ?? members[0]?.id ?? '')
  const [catId, setCatId]       = useState<string | null>(null)
  const [importe, setImporte]   = useState('')
  const [nota, setNota]         = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [pending, setPending]     = useState(false)
  const [autoRecharged, setAutoRecharged] = useState<{ nombre: string; amount: number }[] | null>(null)

  const activeGroup = MAIN_GROUPS.find(g => g.value === group)!
  const dirs = DIRECTIONS[group]
  const tipo = resolvedTipo(group, dir)
  const filteredCats = categorias.filter(c => c.tipo === tipo)

  function handleGroupChange(next: MainGroup) {
    setGroup(next)
    setDir('in')
    setCatId(null)
  }

  function handleDirChange(next: Direction) {
    setDir(next)
    setCatId(null)
  }

  function handleClose() {
    setGroup('gasto')
    setDir('in')
    setUserId(currentUserId ?? members[0]?.id ?? '')
    setCatId(null)
    setImporte('')
    setNota('')
    setError(null)
    setAutoRecharged(null)
    onClose()
  }

  async function handleSubmit() {
    if (!importe || Number(importe) <= 0) { setError('Ingresa un monto válido'); return }
    if (filteredCats.length > 0 && !catId) { setError('Selecciona una categoría'); return }

    setPending(true)
    setError(null)

    const form = new FormData()
    form.set('quincena_id', quincenaId)
    form.set('tipo', tipo)
    form.set('importe', importe)
    form.set('user_id', userId)
    form.set('fecha', fecha)
    if (nota) form.set('descripcion', nota)
    const efectiveCat = catId ?? (filteredCats[0]?.id ?? null)
    if (efectiveCat) form.set('categoria_id', efectiveCat)

    const result = await createTransaccion(form)
    setPending(false)

    if (!result.ok) { setError(result.error); return }

    if (result.data.autoRecharged.length > 0) {
      setAutoRecharged(result.data.autoRecharged)
    } else {
      handleClose()
    }
  }

  const lbl: React.CSSProperties = {
    fontSize: '.65em', fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '.12em', color: 'var(--t3)', marginBottom: 8, display: 'block',
  }

  if (autoRecharged !== null) {
    return (
      <BottomSheet open={open} onClose={handleClose} title="Recargas automáticas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '.82em', color: 'var(--t2)', lineHeight: 1.5 }}>
            Del salario se movieron automáticamente los siguientes montos a bolsillos:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {autoRecharged.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--rm)',
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.1em', color: 'var(--bl)' }}>◧</span>
                  <span style={{ fontSize: '.88em', fontWeight: 800, color: 'var(--t1)' }}>{r.nombre}</span>
                </div>
                <span className="num" style={{ fontSize: '.9em', fontWeight: 900, color: 'var(--bl)' }}>
                  −${r.amount.toLocaleString('es-CO')}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              width: '100%', padding: 13,
              background: 'var(--y)', borderRadius: 'var(--rm)', border: 'none',
              fontSize: '.9em', fontWeight: 900, color: 'var(--yt)',
              textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer',
            }}
          >
            Listo
          </button>
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Nueva transacción">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Tipo principal ── */}
        <div>
          <span style={lbl}>Tipo</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {MAIN_GROUPS.map(g => {
              const sel = group === g.value
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => handleGroupChange(g.value)}
                  style={{
                    background: sel ? g.bg : 'var(--s2)',
                    border: `1.5px solid ${sel ? g.color : 'var(--b1)'}`,
                    borderRadius: 'var(--rm)',
                    padding: '11px 4px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'all .13s', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '1.2em', lineHeight: 1, color: sel ? g.color : 'var(--t3)' }}>
                    {g.icon}
                  </span>
                  <span style={{
                    fontSize: '.6em', fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '.03em', color: sel ? 'var(--t1)' : 'var(--t3)',
                  }}>
                    {g.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Dirección (solo para Crédito, Ahorro, Bolsillo) ── */}
        {dirs && (
          <div>
            <span style={lbl}>Dirección</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['in', 'out'] as Direction[]).map(d => {
                const sel = dir === d
                const opt = d === 'in' ? dirs.in : dirs.out
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDirChange(d)}
                    style={{
                      flex: 1,
                      background: sel ? activeGroup.bg : 'var(--s2)',
                      border: `1.5px solid ${sel ? activeGroup.color : 'var(--b1)'}`,
                      borderRadius: 'var(--rm)',
                      padding: '10px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      transition: 'all .13s', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '1em', color: sel ? activeGroup.color : 'var(--t3)' }}>
                      {d === 'in' ? '→' : '←'}
                    </span>
                    <span style={{
                      fontSize: '.78em', fontWeight: 900, textTransform: 'uppercase',
                      letterSpacing: '.04em', color: sel ? 'var(--t1)' : 'var(--t3)',
                    }}>
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Quién ── */}
        {members.length > 1 && (
          <div>
            <span style={lbl}>¿Quién?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {members.map(m => {
                const sel = userId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setUserId(m.id)}
                    style={{
                      flex: 1,
                      background: sel ? 'var(--y0)' : 'var(--s2)',
                      border: `1.5px solid ${sel ? 'var(--y)' : 'var(--b1)'}`,
                      borderRadius: 'var(--rm)', padding: '10px 12px',
                      display: 'flex', alignItems: 'center', gap: 9,
                      transition: 'all .13s', cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 'var(--rs)',
                      background: `color-mix(in srgb, ${m.color_hex} 22%, transparent)`,
                      color: m.color_hex,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.88em', fontWeight: 900, flexShrink: 0,
                    }}>
                      {m.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '.85em', fontWeight: 800, color: 'var(--t1)' }}>
                      {m.display_name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Fecha (persiste entre transacciones) ── */}
        <div>
          <span style={lbl}>Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={e => onFechaChange(e.target.value)}
            className="zinput"
          />
        </div>

        {/* ── Monto ── */}
        <div>
          <span style={lbl}>Monto</span>
          <div style={{
            background: 'var(--s2)',
            border: `1.5px solid ${importe ? activeGroup.color : 'var(--b1)'}`,
            borderRadius: 'var(--rm)', padding: '11px 14px',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'border-color .13s',
          }}>
            <span style={{ fontSize: '1.3em', fontWeight: 900, color: 'var(--t3)', fontStyle: 'italic' }}>$</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="0"
              value={importe}
              onChange={e => setImporte(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'inherit', fontSize: '1.8em', fontWeight: 900,
                letterSpacing: '-.04em', fontStyle: 'italic', color: 'var(--t1)', width: '100%',
              }}
            />
          </div>
        </div>

        {/* ── Categoría ── */}
        {filteredCats.length > 0 && (
          <div>
            <span style={lbl}>Categoría</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {filteredCats.map(c => {
                const sel = catId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCatId(sel ? null : c.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 'var(--rx)',
                      fontSize: '.75em', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '.04em',
                      background: sel ? 'var(--y0)' : 'var(--s2)',
                      border: `1px solid ${sel ? 'var(--y)' : 'var(--b1)'}`,
                      color: sel ? 'var(--y)' : 'var(--t2)',
                      transition: 'all .12s', cursor: 'pointer',
                    }}
                  >
                    {c.nombre}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Nota ── */}
        <div>
          <span style={lbl}>Nota</span>
          <textarea
            rows={2}
            placeholder="Descripción opcional..."
            value={nota}
            onChange={e => setNota(e.target.value)}
            className="zinput"
            style={{ resize: 'none' }}
          />
        </div>

        {/* ── Error ── */}
        {error && (
          <p style={{
            fontSize: '.75em', fontWeight: 700, color: 'var(--r)',
            background: 'var(--r0)', border: '1px solid var(--r)',
            borderRadius: 'var(--rs)', padding: '8px 12px',
          }}>
            {error}
          </p>
        )}

        {/* ── Submit ── */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          style={{
            width: '100%', padding: 13,
            background: pending ? 'var(--s3)' : 'var(--y)',
            borderRadius: 'var(--rm)', border: 'none',
            fontSize: '.9em', fontWeight: 900,
            color: pending ? 'var(--t3)' : 'var(--yt)',
            textTransform: 'uppercase', letterSpacing: '.06em',
            cursor: pending ? 'default' : 'pointer',
            transition: 'background .15s, color .15s',
          }}
        >
          {pending ? 'Guardando...' : 'Registrar'}
        </button>

      </div>
    </BottomSheet>
  )
}
