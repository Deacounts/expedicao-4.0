import { useEffect, useState } from 'react'
import { Gargalos, Indicadores, Prazo, Qualidade, Resumo } from './pages/Telas'
import EstudoCaso from './pages/EstudoCaso'
import { meta } from './lib/data'

const TELAS = [
  { id: 'resumo', nome: 'Resumo', C: Resumo },
  { id: 'indicadores', nome: 'Indicadores', C: Indicadores, filtros: true },
  { id: 'prazo', nome: 'Prazo', C: Prazo, filtros: true },
  { id: 'gargalos', nome: 'Gargalos', C: Gargalos, filtros: true },
  { id: 'qualidade', nome: 'Qualidade', C: Qualidade, filtros: true },
  { id: 'caso', nome: 'Estudo de caso', C: EstudoCaso },
]

const telaDoHash = () => {
  const h = window.location.hash.replace('#', '')
  return TELAS.some((t) => t.id === h) ? h : 'resumo'
}

export default function App() {
  const [tela, setTela] = useState(telaDoHash)
  const [f, setF] = useState({ janela: '30', turno: 'todos', transp: 'todos' })

  useEffect(() => {
    const on = () => {
      setTela(telaDoHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const atual = TELAS.find((t) => t.id === tela)
  const Tela = atual.C
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))
  const filtrado = f.turno !== 'todos' || f.transp !== 'todos'

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 pt-4 sm:px-6">
          <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-s1 text-white" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M2 16V6h12v10M14 9h4l3 4v3h-2" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>
          </div>
          <div>
            <p className="text-[17px] font-semibold leading-tight text-ink">Expedição 4.0</p>
            <p className="text-[12.5px] text-ink-2">Redesenho de processo de um armazém fictício · dados simulados</p>
          </div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-[1180px] gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Telas">
          {TELAS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              aria-current={tela === t.id ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[13.5px] font-medium transition-colors ${tela === t.id ? 'border-s1 text-ink' : 'border-transparent text-ink-2 hover:text-ink'}`}
            >
              {t.nome}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6">
        {atual.filtros && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <span>Comparando 30 dias antes × 30 dias depois da mudança.</span>
            <span className="text-muted">Filtrar:</span>
            <label className="sr-only" htmlFor="turno">Turno</label>
            <select id="turno" className="filtro" value={f.turno} onChange={set('turno')}>
              <option value="todos">Todos os turnos</option>
              {meta.turnos.map((t, i) => <option key={t.nome} value={i}>Turno da {t.nome.toLowerCase()}</option>)}
            </select>
            <label className="sr-only" htmlFor="transp">Transportadora</label>
            <select id="transp" className="filtro" value={f.transp} onChange={set('transp')}>
              <option value="todos">Todas as transportadoras</option>
              {meta.transportadoras.map((t, i) => <option key={t.id} value={i}>{t.nome}</option>)}
            </select>
            {filtrado && (
              <button className="text-[12.5px] text-s1 underline underline-offset-4" onClick={() => setF({ janela: '30', turno: 'todos', transp: 'todos' })}>
                limpar
              </button>
            )}
          </div>
        )}
        <Tela f={f} />
      </main>

      <footer className="mx-auto max-w-[1180px] px-4 pb-8 text-[12px] text-muted sm:px-6">
        Projeto de portfólio. Empresa, pessoas e números são fictícios, gerados por <code>scripts/gerar_base.py</code> (semente {meta.seed}).
      </footer>
    </div>
  )
}
