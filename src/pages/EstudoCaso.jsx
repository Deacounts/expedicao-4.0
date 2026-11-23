import { Card, Nota } from '../components/ui'
import { fmt, meta, totais } from '../lib/data'

/* =============================================================== BPMN em SVG */
const LANE_H = 84
const LABEL_W = 92
const COL_W = 116
const TW = 98
const TH = 50

function Bpmn({ lanes, nodes, edges, cols, titulo }) {
  const W = LABEL_W + cols * COL_W + 8
  const H = lanes.length * LANE_H
  const pos = Object.fromEntries(
    nodes.map((n) => [n.id, { ...n, x: LABEL_W + n.col * COL_W + COL_W / 2, y: lanes.indexOf(n.lane) * LANE_H + LANE_H / 2 }]),
  )
  const meia = (n) => (n.tipo === 'task' || n.tipo === 'nota' ? TW / 2 : n.tipo === 'gateway' ? 22 : 15)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[920px]" role="img" aria-label={titulo}>
        <defs>
          <marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-2)" />
          </marker>
        </defs>
        {lanes.map((l, i) => (
          <g key={l}>
            <rect x="0.5" y={i * LANE_H + 0.5} width={W - 1} height={LANE_H} fill={i % 2 ? 'var(--surface)' : 'var(--surface-2)'} stroke="var(--grid)" />
            <rect x="0.5" y={i * LANE_H + 0.5} width={LABEL_W - 10} height={LANE_H} fill="var(--surface-2)" stroke="var(--grid)" />
            <text x={(LABEL_W - 10) / 2} y={i * LANE_H + LANE_H / 2 + 4} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--ink-2)">{l}</text>
          </g>
        ))}
        {edges.map(([a, b, rotulo, saida], i) => {
          const s = pos[a]
          const t = pos[b]
          let d
          let lx
          let ly
          if (saida === 'baixo') {
            d = `M${s.x} ${s.y + meia(s)} V${t.y} H${t.x - meia(t)}`
            lx = s.x + 6
            ly = s.y + meia(s) + 14
          } else if (Math.abs(s.y - t.y) < 1) {
            d = `M${s.x + meia(s)} ${s.y} H${t.x - meia(t)}`
            lx = s.x + meia(s) + 6
            ly = s.y - 6
          } else {
            const mx = t.x - meia(t) - 12
            d = `M${s.x + meia(s)} ${s.y} H${mx} V${t.y} H${t.x - meia(t)}`
            lx = s.x + meia(s) + 6
            ly = s.y - 6
          }
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--ink-2)" strokeWidth="1.4" markerEnd="url(#seta)" />
              {rotulo && <text x={lx} y={ly} fontSize="11" fontWeight="600" fill="var(--ink-2)">{rotulo}</text>}
            </g>
          )
        })}
        {Object.values(pos).map((n) => {
          const cor = n.alerta ? 'var(--critical)' : n.novo ? 'var(--s1)' : 'var(--ink-2)'
          const linhas = n.label.split('\n')
          return (
            <g key={n.id}>
              {n.tipo === 'task' && (
                <rect x={n.x - TW / 2} y={n.y - TH / 2} width={TW} height={TH} rx="9" fill="var(--surface)" stroke={cor} strokeWidth={n.alerta || n.novo ? 2 : 1.3} />
              )}
              {n.tipo === 'nota' && (
                <rect x={n.x - TW / 2} y={n.y - TH / 2} width={TW} height={TH} rx="4" fill="none" stroke="var(--s1)" strokeDasharray="4 3" strokeWidth="1.4" />
              )}
              {(n.tipo === 'start' || n.tipo === 'end' || n.tipo === 'timer') && (
                <circle cx={n.x} cy={n.y} r="15" fill="var(--surface)" stroke={cor} strokeWidth={n.tipo === 'end' ? 3.5 : 1.5} />
              )}
              {n.tipo === 'timer' && (
                <>
                  <circle cx={n.x} cy={n.y} r="11.5" fill="none" stroke={cor} strokeWidth="1.2" />
                  <path d={`M${n.x} ${n.y - 7} V${n.y} L${n.x + 5} ${n.y + 3}`} fill="none" stroke={cor} strokeWidth="1.4" />
                </>
              )}
              {n.tipo === 'gateway' && (
                <>
                  <path d={`M${n.x} ${n.y - 22} L${n.x + 22} ${n.y} L${n.x} ${n.y + 22} L${n.x - 22} ${n.y} Z`} fill="var(--surface)" stroke={cor} strokeWidth="1.5" />
                  <path d={`M${n.x - 7} ${n.y - 7} L${n.x + 7} ${n.y + 7} M${n.x + 7} ${n.y - 7} L${n.x - 7} ${n.y + 7}`} stroke={cor} strokeWidth="2" />
                </>
              )}
              {n.tipo === 'task' || n.tipo === 'nota' ? (
                <text x={n.x} y={n.y - (linhas.length - 1) * 6.5 + 4} textAnchor="middle" fontSize="11.5" fill="var(--ink)">
                  {linhas.map((l, i) => (
                    <tspan key={i} x={n.x} dy={i ? 13 : 0}>{l}</tspan>
                  ))}
                </text>
              ) : (
                <text x={n.x} y={n.tipo === 'gateway' ? n.y - 42 : n.y + 30} textAnchor="middle" fontSize="10.5" fill="var(--ink-2)">
                  {linhas.map((l, i) => (
                    <tspan key={i} x={n.x} dy={i ? 12 : 0}>{l}</tspan>
                  ))}
                </text>
              )}
              {n.tag && (
                <text x={n.x} y={n.y + TH / 2 + 14} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={n.alerta ? 'var(--critical)' : 'var(--s1)'}>
                  {n.tag}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const LANES = ['Sistema', 'Líder de turno', 'Separador', 'Embalador', 'Conferente', 'Expedidor']

const ASIS = {
  cols: 11,
  nodes: [
    { id: 's', tipo: 'start', lane: 'Sistema', col: 0, label: 'Pedido\ndisponível' },
    { id: 'tm', tipo: 'timer', lane: 'Líder de turno', col: 1, label: 'A cada 2h', alerta: true },
    { id: 'lib', tipo: 'task', lane: 'Líder de turno', col: 2, label: '1. Liberar\nonda fixa', alerta: true, tag: 'ignora o corte' },
    { id: 'pick', tipo: 'task', lane: 'Separador', col: 3, label: '2. Picking por\nordem de pedido', tag: 'rota longa', alerta: true },
    { id: 'cons', tipo: 'task', lane: 'Separador', col: 4, label: '3. Consolidar\nna bancada', alerta: true, tag: 'espera' },
    { id: 'pack', tipo: 'task', lane: 'Embalador', col: 5, label: '4. Packing\n(caixa no olho)' },
    { id: 'conf', tipo: 'task', lane: 'Conferente', col: 6, label: '5. Conferência\n100%', alerta: true, tag: 'gargalo' },
    { id: 'etq', tipo: 'task', lane: 'Embalador', col: 7, label: '6. Etiquetar\n(impressora comp.)', alerta: true, tag: 'fila' },
    { id: 'sort', tipo: 'task', lane: 'Expedidor', col: 8, label: '7. Sorting\nmanual' },
    { id: 'car', tipo: 'task', lane: 'Expedidor', col: 9, label: '8. Carregar\ncaminhão' },
    { id: 'e', tipo: 'end', lane: 'Expedidor', col: 10, label: 'Expedido ou\nfica p/ amanhã' },
  ],
  edges: [['s', 'tm'], ['tm', 'lib'], ['lib', 'pick'], ['pick', 'cons'], ['cons', 'pack'], ['pack', 'conf'], ['conf', 'etq'], ['etq', 'sort'], ['sort', 'car'], ['car', 'e']],
}

const TOBE = {
  cols: 10,
  nodes: [
    { id: 's', tipo: 'start', lane: 'Sistema', col: 0, label: 'Pedido\ndisponível' },
    { id: 'lib', tipo: 'task', lane: 'Sistema', col: 1, label: '1. Onda dinâmica\npor corte', novo: true, tag: 'prioriza o corte' },
    { id: 'painel', tipo: 'nota', lane: 'Líder de turno', col: 4, label: 'Painel de SLA\npor hora' },
    { id: 'pick', tipo: 'task', lane: 'Separador', col: 2, label: '2. Picking por\nzona + rota', novo: true },
    { id: 'pack', tipo: 'task', lane: 'Embalador', col: 3, label: '3. Packing c/\ncaixa sugerida', novo: true },
    { id: 'gw', tipo: 'gateway', lane: 'Embalador', col: 4, label: 'Pedido\nde risco?' },
    { id: 'conf', tipo: 'task', lane: 'Conferente', col: 5, label: '4. Conferência\npor risco', novo: true, tag: '~20% dos pedidos' },
    { id: 'etq', tipo: 'task', lane: 'Embalador', col: 6, label: '5. Etiqueta\nno posto', novo: true },
    { id: 'sort', tipo: 'task', lane: 'Expedidor', col: 7, label: '6. Sorting por\ncor de rota', novo: true },
    { id: 'car', tipo: 'task', lane: 'Expedidor', col: 8, label: '7. Carregar\ncaminhão' },
    { id: 'e', tipo: 'end', lane: 'Expedidor', col: 9, label: 'Expedido\nno corte' },
  ],
  edges: [['s', 'lib'], ['lib', 'pick'], ['pick', 'pack'], ['pack', 'gw'], ['gw', 'conf', 'Sim', 'baixo'], ['gw', 'etq', 'Não'], ['conf', 'etq'], ['etq', 'sort'], ['sort', 'car'], ['car', 'e']],
}

/* =============================================================== conteúdo */
const GUT = [
  ['Pedidos perdem o horário de corte', 'Espera', 5, 5, 4],
  ['Item errado ou faltando no pedido', 'Defeitos', 5, 4, 3],
  ['Conferência 100% refaz o picking', 'Superprocessamento', 4, 4, 3],
  ['Rota de picking longa', 'Movimentação', 3, 3, 4],
  ['Fila na impressora de etiquetas', 'Espera', 3, 4, 2],
  ['Caixa escolhida no olho', 'Excesso de material', 2, 2, 3],
]

const PORQUES = [
  ['Por que os pedidos perdem o corte?', 'Porque chegam na doca depois do horário da transportadora.'],
  ['Por que chegam atrasados?', 'Porque ficam parados na conferência e na consolidação.'],
  ['Por que param ali?', 'Porque as ondas jogam um pico de pedidos de uma vez nessas etapas.'],
  ['Por que as ondas criam pico?', 'Porque são fixas a cada 2h e ignoram o corte de cada transportadora.'],
  ['Por que são fixas?', 'Porque não existe regra de priorização por corte.'],
]

const ISHIKAWA = [
  ['Método', 'Ondas fixas, conferência 100%'],
  ['Máquina', 'Impressora compartilhada'],
  ['Mão de obra', 'Separadores sem divisão por zona'],
  ['Material', 'Caixas sem padrão por tamanho de pedido'],
  ['Medida', 'Ninguém acompanha o SLA por hora, só no fim do turno'],
  ['Meio ambiente', 'Layout com corredores longos entre zonas'],
]

function Secao({ n, titulo, sub, children }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="flex items-baseline gap-2 text-[18px] font-semibold text-ink">
          <span className="tnum text-[13px] font-medium text-muted">{n}</span>
          {titulo}
        </h2>
        {sub && <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-ink-2">{sub}</p>}
      </div>
      {children}
    </section>
  )
}

/** termo técnico + explicação simples */
function Termo({ nome, children }) {
  return (
    <p className="text-[13px] leading-relaxed text-ink-2">
      <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[12px] font-semibold text-ink">{nome}</span>
      {children}
    </p>
  )
}

function Destaque({ children }) {
  return (
    <div className="rounded-xl border-l-4 border-s1 bg-surface p-4 text-[14px] leading-relaxed text-ink" style={{ borderLeftColor: 'var(--s1)' }}>
      {children}
    </div>
  )
}

const COMPETENCIAS = [
  ['Processos', ['Mapeamento BPMN (AS-IS e TO-BE)', 'Matriz GUT', '5 Porquês', 'Ishikawa (6M)', 'Desperdícios Lean', 'Definição de KPIs e metas']],
  ['Dados', ['Simulação de operação em Python', 'Modelagem de filas', 'Base com 4 tabelas e 478 mil pedidos', 'Cálculo de indicadores']],
  ['Desenvolvimento', ['React + Vite', 'Tailwind CSS', 'Recharts', 'Diagramas BPMN em SVG', 'Tema claro e escuro, responsivo']],
]

export default function EstudoCaso() {
  const r = meta.resumo
  const todos = { janela: '30', turno: 'todos', transp: 'todos' }
  const ta = totais(todos, 'AS-IS')
  const tb = totais(todos, 'TO-BE')
  const espEtq = (t) => t.w_etiqueta / t.ped
  const pctEtq = (t) => (100 * t.e_etiqueta) / t.ped

  const mudancas = [
    ['Ondas dinâmicas por horário de corte', 'Perda do corte', 'SLA de 91% para 98%', `SLA de ${fmt(r['AS-IS'].sla_pct, 1)}% para ${fmt(r['TO-BE'].sla_pct, 1)}%`],
    ['Picking por zona com rota por endereço', 'Rota longa', '+25% de itens/hora', `${fmt(r['AS-IS'].itens_por_hora)} → ${fmt(r['TO-BE'].itens_por_hora)} itens/h (+${fmt(100 * (r['TO-BE'].itens_por_hora / r['AS-IS'].itens_por_hora - 1))}%)`],
    ['Conferência só de pedidos de risco + amostra de 5%', 'Superprocessamento', 'De 100% para cerca de 20%', `${fmt(r['TO-BE'].conferencia_pct, 1)}% conferidos, e o erro caiu de ${fmt(r['AS-IS'].erro_pct, 2)}% para ${fmt(r['TO-BE'].erro_pct, 2)}%`],
    ['Caixa sugerida pelo sistema', 'Excesso de material', '−15% de material', 'Não simulado (fora do escopo da base)'],
    ['Impressora por posto de packing', 'Fila de etiqueta', 'Fila zerada', `Espera de ${fmt(espEtq(ta), 0)} min para 0 min`],
    ['Sorting por cor de rota na etiqueta', 'Erro de sorting', 'Menos volumes no caminhão errado', `Erros de etiqueta/rota de ${fmt(pctEtq(ta), 2)}% para ${fmt(pctEtq(tb), 2)}%`],
    ['Painel de SLA por hora para o líder', 'Falta de medida', 'Reação durante o turno', 'Este dashboard'],
  ]

  return (
    <article className="grid gap-8">
      <Card>
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Estudo de caso · dados simulados</p>
        <h1 className="mt-1 max-w-3xl text-[22px] font-semibold leading-snug text-ink sm:text-[26px]">
          Como eu redesenharia a expedição de um CD para parar de perder o horário de corte
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink-2">
          A LogiFlex é um CD (centro de distribuição) de e-commerce fictício em Campinas, com 2 turnos e cerca de 8.000 pedidos por dia.
          <strong className="text-ink"> {fmt(r['AS-IS'].perderam_corte_por_100, 1)} em cada 100 pedidos perdiam o horário de corte</strong>, isto é,
          ficavam prontos depois que o caminhão da transportadora já tinha saído, e só eram entregues no dia seguinte.
        </p>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-2">
          Apliquei ferramentas clássicas de gestão de processos para achar a causa, redesenhei o fluxo e medi o resultado em 30 dias antes × 30 dias depois.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          {[
            ['Processo', 'Expedição, da liberação ao caminhão'],
            ['Base', `${fmt(r['AS-IS'].pedidos + r['TO-BE'].pedidos)} pedidos, 60 dias`],
            ['Ferramentas', 'BPMN, GUT, 5 Porquês, Ishikawa'],
            ['Stack', 'Python, React, Recharts, Tailwind'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-surface-2 p-3">
              <dt className="text-[11.5px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Secao
        n="01"
        titulo="Como o processo era (AS-IS)"
        sub="8 etapas em fila: cada uma espera a anterior terminar. Os pedidos eram liberados em ondas fixas a cada 2 horas, sem olhar o horário de saída de cada caminhão."
      >
        <Card>
          <Termo nome="BPMN">notação padrão para desenhar processos. Cada faixa horizontal é uma função (quem faz) e cada caixa é uma atividade (o que faz). As setas mostram a ordem.</Termo>
          <div className="mt-3"><Bpmn titulo="BPMN do processo AS-IS" lanes={LANES} {...ASIS} /></div>
          <Nota>Em vermelho, os pontos onde o pedido fica parado esperando. A onda das 6h mistura pedidos com caminhão às 11h, 16h e 21h na mesma fila, então os pedidos mais urgentes não têm prioridade.</Nota>
        </Card>
      </Secao>

      <Secao n="02" titulo="Diagnóstico: qual problema atacar e por que ele acontece" sub="Três ferramentas, cada uma responde a uma pergunta.">
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3" titulo="Matriz GUT: qual problema atacar primeiro?">
            <div className="mb-3">
              <Termo nome="GUT">dou uma nota de 1 a 5 para a Gravidade, a Urgência e a Tendência (se piora com o tempo) de cada problema. Multiplicando as três, o maior número é a prioridade.</Termo>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="pb-2 font-normal">Problema</th>
                    <th className="pb-2 font-normal">Desperdício Lean</th>
                    <th className="w-8 pb-2 text-center font-normal">G</th>
                    <th className="w-8 pb-2 text-center font-normal">U</th>
                    <th className="w-8 pb-2 text-center font-normal">T</th>
                    <th className="w-[130px] pb-2 pl-3 font-normal">GUT</th>
                  </tr>
                </thead>
                <tbody>
                  {GUT.map(([p, d, g, u, t], i) => (
                    <tr key={p} className="border-t border-line">
                      <td className={`py-2 pr-2 text-ink ${i === 0 ? 'font-semibold' : ''}`}>{p}</td>
                      <td className="py-2 pr-2 text-ink-2">{d}</td>
                      <td className="tnum py-2 text-center">{g}</td>
                      <td className="tnum py-2 text-center">{u}</td>
                      <td className="tnum py-2 text-center">{t}</td>
                      <td className="py-2 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded bg-surface-2">
                            <div className="h-2 rounded" style={{ width: `${g * u * t}%`, background: i === 0 ? 'var(--critical)' : 'var(--s1)' }} />
                          </div>
                          <span className="tnum w-7 text-right font-medium">{g * u * t}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="lg:col-span-2" titulo="5 Porquês: qual é a causa raiz?">
            <div className="mb-3">
              <Termo nome="5 Porquês">pergunto "por quê?" até sair do sintoma e chegar à origem do problema.</Termo>
            </div>
            <ol className="grid gap-2.5 text-[13px]">
              {PORQUES.map(([q, a], i) => (
                <li key={q} className="grid grid-cols-[22px_1fr] gap-2">
                  <span className={`tnum grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-semibold ${i === 4 ? 'bg-critical text-white' : 'bg-surface-2 text-ink-2'}`}>{i + 1}</span>
                  <div>
                    <p className="font-medium text-ink">{q}</p>
                    <p className="text-ink-2">{a}{i === 4 && <strong className="text-ink"> Esta é a causa raiz.</strong>}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <Card titulo="Ishikawa (6M): o que mais contribui para o atraso?">
          <div className="mb-3">
            <Termo nome="Ishikawa">também chamado de espinha de peixe. Organiza as causas de um problema em 6 categorias, os 6M, para não esquecer nenhum lado.</Termo>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ISHIKAWA.map(([m, c]) => (
              <div key={m} className="rounded-lg border border-line p-3">
                <p className="text-[12px] font-semibold text-ink">{m}</p>
                <p className="mt-0.5 text-[13px] text-ink-2">{c}</p>
              </div>
            ))}
          </div>
        </Card>
        <Destaque>
          <strong>Conclusão do diagnóstico:</strong> o problema nº 1 é perder o horário de corte (GUT 100). A causa raiz não é a velocidade das pessoas,
          é a <strong>falta de uma regra que priorize os pedidos pelo horário de saída do caminhão</strong>.
        </Destaque>
      </Secao>

      <Secao
        n="03"
        titulo="Como o processo ficou (TO-BE)"
        sub="7 etapas e 1 decisão. O sistema libera primeiro os pedidos cujo caminhão sai mais cedo, em lotes pequenos, e só os pedidos de risco passam pela conferência."
      >
        <Card>
          <Termo nome="Gateway">o losango é um ponto de decisão. Aqui: "este pedido tem risco de erro?". Se sim, vai para a conferência. Se não, segue direto para a etiqueta.</Termo>
          <div className="mt-3"><Bpmn titulo="BPMN do processo TO-BE" lanes={LANES} {...TOBE} /></div>
          <Nota>Em azul, o que mudou. Pedido de risco = 4 ou mais itens, valor a partir de R$ 900 ou separado por alguém com menos de 30 dias de casa. Além deles, 5% dos outros pedidos são sorteados para conferência.</Nota>
        </Card>
      </Secao>

      <Secao n="04" titulo="O que eu esperava × o que aconteceu" sub="Antes de testar, escrevi a hipótese de ganho de cada mudança. Depois comparei com os 30 dias da base simulada.">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="pb-2 font-normal">Mudança (e o problema que ela ataca)</th>
                  <th className="pb-2 font-normal">Hipótese</th>
                  <th className="pb-2 font-normal">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {mudancas.map(([m, a, h, res]) => (
                  <tr key={m} className="border-t border-line align-top">
                    <td className="py-2.5 pr-3">
                      <p className="text-ink">{m}</p>
                      <p className="text-[12px] text-muted">{a}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-2">{h}</td>
                    <td className="py-2.5 font-medium text-ink">{res}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Nota>
            Nem toda meta foi batida: o backlog no fim do turno caiu de {fmt(r['AS-IS'].backlog_pct, 1)}% para {fmt(r['TO-BE'].backlog_pct, 1)}% do volume,
            mas a meta era 2%. Uma próxima iteração seria congelar a liberação nos últimos 30 minutos de cada turno.
          </Nota>
        </Card>
      </Secao>

      <Secao n="05" titulo="Competências aplicadas">
        <div className="grid gap-3 md:grid-cols-3">
          {COMPETENCIAS.map(([area, itens]) => (
            <Card key={area} titulo={area}>
              <ul className="flex flex-wrap gap-1.5">
                {itens.map((i) => (
                  <li key={i} className="rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2">{i}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Secao>

      <Secao n="06" titulo="Sobre os dados">
        <Card>
          <p className="max-w-3xl text-[14px] leading-relaxed text-ink-2">
            <strong className="text-ink">Todos os dados são simulados.</strong> Empresa, pessoas e números são fictícios. Escrevi um script em Python
            (<code className="text-ink">scripts/gerar_base.py</code>) que simula a operação pedido a pedido, com filas, faltas, paradas e erros.
            Os gargalos não foram inventados: eles aparecem sozinhos quando a regra de liberação muda. O método é o mesmo que eu usaria numa operação real.
          </p>
        </Card>
      </Secao>
    </article>
  )
}
