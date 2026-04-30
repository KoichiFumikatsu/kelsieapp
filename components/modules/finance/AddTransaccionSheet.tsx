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
}

type TipoTx = 'gasto' | 'ingreso' | 'credito' | 'ahorro' | 'bolsillo' | 'pago_credito'

const TIPOS: { value: TipoTx; label: string; icon: string; color: string; bg: string }[] = [
  { value: 'gasto',        label: 'Gasto',    icon: '▽', color: 'var(--r)',  bg: 'var(--r0)'  },
  { value: 'ingreso',      label: 'Ingreso',  icon: '△', color: 'var(--g)',  bg: 'var(--g0)'  },
  { value: 'credito',      label: 'Crédito',  icon: '▣', color: 'var(--pu)', bg: 'var(--p0)'  },
  { value: 'ahorro',       label: 'Ahorro',   icon: '⊙', color: 'var(--y)',  bg: 'var(--y0)'  },
  { value: 'bolsillo',     label: 'Bolsillo', icon: '◧', color: 'var(--bl)', bg: 'var(--b0c)' },
  { value: 'pago_credito', label: 'Pago TC',  icon: '↕', color: 'var(--pu)', bg: 'var(--p0)'  },
]

export function AddTransaccionSheet({ open, onClose, quincenaId, categorias, members, currentUserId }: Props) {
  const [tipo, setTipo]         = useState<TipoTx>('gasto')
  const [userId, setUserId]     = useState(currentUserId ?? members[0]?.id ?? '')
  const [catId, setCatId]       = useState<string | null>(null)
  const [importe, setImporte]   = useState('')
  const [nota, setNota]         = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [pending, setPending]   = useState(false)

  const activeTipo = TIPOS.find(t => t.value === tipo)!

  const filteredCats = categorias.filter(c => c.tipo === tipo)

  function handleTipoChange(next: TipoTx) {
    setTipo(next)
    setCatId(null)
  }

  function handleClose() {
    setTipo('gasto')
    setUserId(currentUserId ?? members[0]?.id ?? '')
    setCatId(null)
    setImporte('')
    setNota('')
    setError(null)
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
    form.set('fecha', new Date().toISOString().split('T')[0])
    if (nota) form.set('descripcion', nota)
    if (catId) form.set('categoria_id', catId)
    else if (filteredCats.length > 0) form.set('categoria_id', filteredCats[0].id)

    const result = await createTransaccion(form)
    setPending(false)

    if (!result.ok) { setError(result.error); return }
    handleClose()
  }

  const lbl: React.CSSProperties = {
    fontSize: '.65em', fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '.12em', color: 'var(--t3)', marginBottom: 8, display: 'block',
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Nueva transacción">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Tipo ── */}
        <div>
          <span style={lbl}>Tipo</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {TIPOS.map(t => {
              const sel = tipo === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTipoChange(t.value)}
                  style={{
                    background: sel ? t.bg : 'var(--s2)',
                    border: `1.5px solid ${sel ? t.color : 'var(--b1)'}`,
                    borderRadius: 'var(--rm)',
                    padding: '11px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'all .13s', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '1.25em', lineHeight: 1, color: sel ? t.color : 'var(--t3)' }}>
                    {t.icon}
                  </span>
                  <span style={{
                    fontSize: '.65em', fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '.04em', color: sel ? 'var(--t1)' : 'var(--t3)',
                  }}>
                    {t.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Quién ── */}
        {members.length > 1 && (
          <div>
            <span style={lbl}>¿Quién?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {members.map(m => {
                const sel = userId === m.id
                const initial = m.display_name.charAt(0).toUpperCase()
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setUserId(m.id)}
                    style={{
                      flex: 1, background: sel ? 'var(--y0)' : 'var(--s2)',
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
                      {initial}
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

        {/* ── Monto ── */}
        <div>
          <span style={lbl}>Monto</span>
          <div style={{
            background: 'var(--s2)', border: `1.5px solid ${importe ? activeTipo.color : 'var(--b1)'}`,
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
                      fontSize: '.75em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em',
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
            fontSize: '.9em', fontWeight: 900, color: pending ? 'var(--t3)' : 'var(--yt)',
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
