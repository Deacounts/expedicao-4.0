import raw from '../data/dataset.json'

const objs = ({ cols, rows }) => rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])))

export const meta = raw.meta
export const diario = objs(raw.diario)
export const horario = objs(raw.horario)
export const wip = objs(raw.wip)
export const produtividade = objs(raw.produtividade)
export const equipe = objs(raw.equipe)

export const PERIODOS = { 'AS-IS': 'Antes (AS-IS)', 'TO-BE': 'Depois (TO-BE)' }
export const outro = (p) => (p === 'AS-IS' ? 'TO-BE' : 'AS-IS')
export const COR_TRANSP = ['var(--s1)', 'var(--s2)', 'var(--s3)']

export const JANELAS = [
  { id: '30', nome: '30 dias' },
  { id: '14', nome: 'Últimos 14 dias' },
  { id: '7', nome: 'Últimos 7 dias' },
]

/** índices dos dias do período, recortados pela janela */
export function diasDe(periodo, janela = '30') {
  const ds = meta.dias.map((d, i) => ({ ...d, i })).filter((d) => d.periodo === periodo)
  return janela === '30' ? ds : ds.slice(-Number(janela))
}

const somar = (rows, campos) => {
  const t = Object.fromEntries(campos.map((c) => [c, 0]))
  for (const r of rows) for (const c of campos) t[c] += r[c]
  return t
}

const CAMPOS = ['ped', 'itens', 'ontime', 'lt', 'conf', 'err', 'ret', 'bkl', 'e_item_errado', 'e_faltando', 'e_avaria', 'e_etiqueta', 'f_sep', 'f_emb', 'f_etq', 'f_sor', ...meta.etapas_wip.map((e) => `w_${e}`)]

const passa = (f) => (r) =>
  (f.turno === 'todos' || r.turno === Number(f.turno)) && (f.transp === 'todos' || r.transp === Number(f.transp))

export function totais(f, periodo, dias = diasDe(periodo, f.janela)) {
  const set = new Set(dias.map((d) => d.i))
  const rows = diario.filter((r) => set.has(r.dia) && passa(f)(r))
  const t = somar(rows, CAMPOS)
  const porTurno = (r) => set.has(r.dia) && (f.turno === 'todos' || r.turno === Number(f.turno))
  const prod = somar(produtividade.filter(porTurno), ['itens', 'horas'])
  const eq = somar(equipe.filter(porTurno), ['escalados', 'presentes'])
  return { ...t, prodItens: prod.itens, prodHoras: prod.horas, escalados: eq.escalados, presentes: eq.presentes, nDias: dias.length }
}

/** Os 7 KPIs do projeto: fórmula, meta e sentido */
export const KPIS = [
  { id: 'sla', nome: 'SLA de expedição', un: '%', dec: 1, meta: '≥ 98%', ok: (v) => v >= 98, quase: (v) => v >= 95, calc: (t) => (100 * t.ontime) / t.ped, formula: 'carregados até o corte ÷ pedidos com corte no dia' },
  { id: 'lead', nome: 'Lead time interno', un: ' h', dec: 1, meta: '≤ 4 h', ok: (v) => v <= 4, quase: (v) => v <= 4.5, calc: (t) => t.lt / t.ped, formula: 'carregamento − liberação (média)', menorMelhor: true },
  { id: 'prod', nome: 'Produtividade de picking', un: ' itens/h', dec: 0, meta: '≥ 120', ok: (v) => v >= 120, quase: (v) => v >= 110, calc: (t) => t.prodItens / t.prodHoras, formula: 'itens separados ÷ horas no picking', semTransp: true },
  { id: 'erro', nome: 'Taxa de erro', un: '%', dec: 2, meta: '≤ 0,3%', ok: (v) => v <= 0.3, quase: (v) => v <= 0.4, calc: (t) => (100 * t.err) / t.ped, formula: 'pedidos com erro ÷ expedidos', menorMelhor: true },
  { id: 'conf', nome: 'Taxa de conferência', un: '%', dec: 1, meta: '15% a 25%', ok: (v) => v >= 15 && v <= 25, quase: (v) => v >= 10 && v <= 35, calc: (t) => (100 * t.conf) / t.ped, formula: 'pedidos conferidos ÷ expedidos', menorMelhor: true },
  { id: 'bkl', nome: 'Backlog no fim do turno', un: '%', dec: 1, meta: '≤ 2% do volume', ok: (v) => v <= 2, quase: (v) => v <= 5, calc: (t) => (100 * t.bkl) / t.ped, formula: 'liberados no turno − chegaram à doca', menorMelhor: true },
  { id: 'abs', nome: 'Absenteísmo', un: '%', dec: 1, meta: '≤ 5%', ok: (v) => v <= 5, quase: (v) => v <= 6, calc: (t) => (100 * (t.escalados - t.presentes)) / t.escalados, formula: 'faltas ÷ escalados', semTransp: true, menorMelhor: true },
]

export function status(kpi, v) {
  if (!Number.isFinite(v)) return 'na'
  return kpi.ok(v) ? 'good' : kpi.quase(v) ? 'warning' : 'critical'
}

export function serieDiaria(f, periodo) {
  return diasDe(periodo, f.janela).map((d) => {
    const t = totais(f, periodo, [d])
    return { data: d.data, ...Object.fromEntries(KPIS.map((k) => [k.id, k.calc(t)])) }
  })
}

// ---------------------------------------------------------------- formatação
const nf = (dec) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
export const fmt = (v, dec = 0) => (Number.isFinite(v) ? nf(dec).format(v) : '—')
export const fmtKpi = (k, v) => `${fmt(v, k.dec)}${k.un}`
export const dataCurta = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
export const hora = (h) => `${String(Math.floor(h)).padStart(2, '0')}h`
