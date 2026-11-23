import { fmt } from '../lib/data'

export function Card({ titulo, sub, children, className = '', direita }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      {(titulo || direita) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {titulo && <h2 className="text-[15px] font-semibold text-ink">{titulo}</h2>}
            {sub && <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p>}
          </div>
          {direita}
        </header>
      )}
      {children}
    </section>
  )
}

const STATUS = {
  good: { label: 'Na meta', icon: '✓', cor: 'var(--good)' },
  warning: { label: 'Perto da meta', icon: '!', cor: 'var(--warning)' },
  critical: { label: 'Fora da meta', icon: '✕', cor: 'var(--critical)' },
  na: { label: 'Sem dado', icon: '–', cor: 'var(--muted)' },
}

export function Status({ s }) {
  const st = STATUS[s]
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
      <span
        className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold"
        style={{ background: st.cor, color: s === 'warning' ? '#0b0b0b' : '#fff' }}
        aria-hidden
      >
        {st.icon}
      </span>
      {st.label}
    </span>
  )
}

/** variação Antes × Depois: verde se melhorou, vermelho se piorou (sempre com seta + texto) */
export function Delta({ kpi, atual, base, rotuloBase }) {
  if (!Number.isFinite(atual) || !Number.isFinite(base)) return null
  const diff = atual - base
  const pp = kpi.un.trim() === '%'
  const melhorou = kpi.id === 'conf' ? null : kpi.menorMelhor ? diff < 0 : diff > 0
  const cor = melhorou === null ? 'var(--ink-2)' : melhorou ? 'var(--good-ink)' : 'var(--critical)'
  const seta = diff > 0 ? '▲' : diff < 0 ? '▼' : '•'
  return (
    <span className="tnum text-[12px]" style={{ color: cor }}>
      {seta} {fmt(Math.abs(diff), kpi.dec)}
      {pp ? ' p.p.' : kpi.un} <span className="text-muted">vs {rotuloBase}</span>
    </span>
  )
}

export function Legenda({ itens }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
      {itens.map((it) => (
        <li key={it.nome} className="flex items-center gap-1.5">
          {it.linha ? (
            <svg width="18" height="8" aria-hidden>
              <line x1="0" y1="4" x2="18" y2="4" stroke={it.cor} strokeWidth="2" strokeDasharray={it.tracejado ? '4 3' : undefined} />
            </svg>
          ) : (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.cor }} aria-hidden />
          )}
          {it.nome}
        </li>
      ))}
    </ul>
  )
}

/** Tooltip padrão para Recharts */
export function Dica({ active, payload, label, formatLabel, formatValue }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-lg">
      <div className="mb-1 font-medium text-ink">{formatLabel ? formatLabel(label) : label}</div>
      {payload.filter((p) => p.value != null).map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
            {p.name}
          </span>
          <span className="tnum font-medium text-ink">{formatValue ? formatValue(p.value, p) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export const eixo = { stroke: 'var(--axis)', tickLine: false, tick: { fill: 'var(--muted)', fontSize: 11 } }
export const grade = { stroke: 'var(--grid)', vertical: false }

export function Nota({ children }) {
  return <p className="mt-3 text-[12px] leading-relaxed text-muted">{children}</p>
}
