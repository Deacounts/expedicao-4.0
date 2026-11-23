import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Dica, Legenda, Status, eixo } from '../components/ui'
import { KPIS, diasDe, fmt, fmtKpi, hora, horario, meta, produtividade, status, totais } from '../lib/data'

/* Linguagem comum: sempre Antes (cinza) × Depois (azul) */
const ANTES = 'var(--ghost)'
const DEPOIS = 'var(--s1)'
const LEGENDA = <Legenda itens={[{ nome: 'Antes', cor: ANTES }, { nome: 'Depois', cor: DEPOIS }]} />
const pct = (v, d = 1) => `${fmt(v, d)}%`

function ComoLer({ children }) {
  return (
    <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
      <strong className="font-semibold text-ink">Como ler: </strong>
      {children}
    </p>
  )
}

function Barras({ data, fmtV, altura = 260, deitado = false, dominio, rotulos = true }) {
  const rot = rotulos ? <LabelList position={deitado ? 'right' : 'top'} formatter={fmtV} style={{ fill: 'var(--ink-2)', fontSize: 11 }} /> : null
  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={deitado ? 'vertical' : 'horizontal'} margin={{ top: 18, right: deitado ? 56 : 8, bottom: 0, left: deitado ? 4 : -8 }} barGap={3}>
          <CartesianGrid stroke="var(--grid)" vertical={false} horizontal={!deitado} />
          {deitado ? (
            <>
              <XAxis type="number" hide domain={dominio} />
              <YAxis type="category" dataKey="nome" width={110} {...eixo} />
            </>
          ) : (
            <>
              <XAxis dataKey="nome" {...eixo} interval={0} />
              <YAxis domain={dominio} ticks={dominio?.[1] === 100 ? [0, 25, 50, 75, 100] : undefined} {...eixo} tickFormatter={fmtV} />
            </>
          )}
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Dica formatValue={fmtV} />} />
          <Bar dataKey="antes" name="Antes" fill={ANTES} radius={deitado ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false}>{rot}</Bar>
          <Bar dataKey="depois" name="Depois" fill={DEPOIS} radius={deitado ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false}>{rot}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* =============================================================== Resumo */
export function Resumo() {
  const r = meta.resumo
  const a = r['AS-IS']
  const d = r['TO-BE']
  const numeros = [
    { rot: 'Pedidos que pegaram o caminhão a tempo', a: pct(a.sla_pct), d: pct(d.sla_pct) },
    { rot: 'Pedidos que chegaram ao cliente com erro', a: pct(a.erro_pct, 2), d: pct(d.erro_pct, 2) },
    { rot: 'Pedidos conferidos um a um', a: pct(a.conferencia_pct, 0), d: pct(d.conferencia_pct, 0) },
  ]
  const passos = [
    ['O problema', `De cada 100 pedidos, ${fmt(a.perderam_corte_por_100, 1)} perdiam o caminhão da transportadora e só saíam no dia seguinte.`],
    ['A causa', 'Os pedidos eram liberados em lotes fixos a cada 2 horas, sem olhar o horário de saída de cada caminhão. Tudo chegava junto e travava na conferência.'],
    ['A solução', 'Liberar primeiro os pedidos cujo caminhão sai mais cedo, em lotes pequenos a cada 15 min, e conferir só os pedidos com mais chance de erro.'],
    ['O resultado', `Pedidos no prazo subiram para ${pct(d.sla_pct)} e os erros caíram pela metade, mesmo conferindo só ${pct(d.conferencia_pct, 0)} dos pedidos.`],
  ]
  const termos = [
    ['Horário de corte', 'hora em que o caminhão da transportadora sai. Pedido pronto depois disso fica para amanhã.'],
    ['Onda', 'lote de pedidos liberado de uma vez para o armazém começar a separar.'],
    ['Picking', 'separar os produtos do pedido nas prateleiras.'],
    ['Packing', 'embalar o pedido.'],
    ['Conferência', 'bipar de novo os itens para checar se o pedido está certo.'],
    ['AS-IS / TO-BE', 'como o processo era (antes) e como ficou (depois).'],
  ]

  return (
    <div className="grid gap-5">
      <section className="card p-5 sm:p-7">
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted">O projeto em 1 minuto · dados simulados</p>
        <h1 className="mt-2 max-w-3xl text-[22px] font-semibold leading-snug text-ink sm:text-[28px]">
          Um centro de distribuição perdia o caminhão em {fmt(a.perderam_corte_por_100, 1)} de cada 100 pedidos. Redesenhei o processo e isso caiu para {fmt(d.perderam_corte_por_100, 1)}.
        </h1>
        <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-ink-2">
          A LogiFlex é uma empresa fictícia que separa e despacha cerca de 8.000 pedidos de loja online por dia. Mapeei o processo, encontrei a causa do atraso
          e montei este painel para comparar 30 dias antes com 30 dias depois da mudança.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {numeros.map((n) => (
            <div key={n.rot} className="rounded-xl bg-surface-2 p-4">
              <p className="text-[13px] text-ink-2">{n.rot}</p>
              <p className="tnum mt-2 flex items-baseline gap-2 text-ink">
                <span className="text-[18px] text-muted line-through decoration-1">{n.a}</span>
                <span aria-hidden className="text-muted">→</span>
                <span className="text-[30px] font-semibold leading-none">{n.d}</span>
              </p>
              <p className="mt-1 text-[12px] text-muted">antes → depois</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {passos.map(([t, txt], i) => (
          <article key={t} className="card p-4">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <span className="tnum grid h-6 w-6 place-items-center rounded-full bg-s1 text-[12px] text-white">{i + 1}</span>
              {t}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{txt}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Por onde seguir">
          <ul className="grid gap-2 text-[13.5px] text-ink-2">
            <li><a className="font-medium text-ink underline decoration-line underline-offset-4" href="#indicadores">Indicadores</a>: os 7 números do processo, antes e depois, e se bateram a meta.</li>
            <li><a className="font-medium text-ink underline decoration-line underline-offset-4" href="#prazo">Prazo</a>: por que os pedidos perdiam o caminhão.</li>
            <li><a className="font-medium text-ink underline decoration-line underline-offset-4" href="#gargalos">Gargalos</a>: em que etapa os pedidos ficavam parados.</li>
            <li><a className="font-medium text-ink underline decoration-line underline-offset-4" href="#qualidade">Qualidade</a>: como conferir menos reduziu o erro.</li>
            <li><a className="font-medium text-ink underline decoration-line underline-offset-4" href="#caso">Estudo de caso</a>: o mapa do processo e o diagnóstico completo.</li>
          </ul>
        </Card>
        <Card titulo="Palavras que aparecem aqui">
          <dl className="grid gap-1.5 text-[13px]">
            {termos.map(([t, d]) => (
              <div key={t}><dt className="inline font-semibold text-ink">{t}: </dt><dd className="inline text-ink-2">{d}</dd></div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  )
}

/* =============================================================== Indicadores */
const SIMPLES = {
  sla: ['Pedidos que pegaram o caminhão a tempo', 'O principal indicador. Quanto maior, melhor.'],
  lead: ['Tempo do pedido dentro do armazém', 'Da liberação até entrar no caminhão. Quanto menor, melhor.'],
  prod: ['Itens separados por hora, por pessoa', 'Mede o quanto a rota no armazém ajuda.'],
  erro: ['Pedidos que chegaram com erro', 'Item errado, faltando, avariado ou etiqueta trocada.'],
  conf: ['Pedidos conferidos um a um', 'Conferir tudo custa tempo. A meta é conferir só o necessário.'],
  bkl: ['Pedidos inacabados na troca de turno', 'Trabalho que passa de um turno para o outro.'],
  abs: ['Faltas da equipe', 'Pessoas escaladas que não vieram.'],
}

export function Indicadores({ f }) {
  const ta = totais(f, 'AS-IS')
  const td = totais(f, 'TO-BE')
  const conf = KPIS.find((k) => k.id === 'conf')
  const erro = KPIS.find((k) => k.id === 'erro')

  return (
    <div className="grid gap-4">
      <Card titulo="Os 7 indicadores, antes e depois" sub="Meta e situação referem-se ao período depois da mudança.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13.5px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="pb-2 font-normal">Indicador</th>
                <th className="pb-2 text-right font-normal">Antes</th>
                <th className="pb-2 text-right font-normal">Depois</th>
                <th className="pb-2 pl-6 font-normal">Meta</th>
                <th className="pb-2 font-normal">Situação</th>
              </tr>
            </thead>
            <tbody>
              {KPIS.map((k) => {
                const va = k.calc(ta)
                const vd = k.calc(td)
                return (
                  <tr key={k.id} className="border-t border-line align-top">
                    <td className="py-3 pr-3">
                      <p className={`text-ink ${k.id === 'sla' ? 'font-semibold' : 'font-medium'}`}>{SIMPLES[k.id][0]}</p>
                      <p className="text-[12px] text-muted">{SIMPLES[k.id][1]}</p>
                    </td>
                    <td className="tnum py-3 text-right text-ink-2">{fmtKpi(k, va)}</td>
                    <td className="tnum py-3 text-right font-semibold text-ink">{fmtKpi(k, vd)}</td>
                    <td className="py-3 pl-6 text-ink-2">{k.meta}</td>
                    <td className="py-3"><Status s={status(k, vd)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card titulo="Conferir menos não aumentou o erro. Diminuiu." direita={LEGENDA}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-1 text-[13px] font-medium text-ink">Pedidos conferidos um a um</p>
            <Barras altura={200} fmtV={(v) => pct(v, 0)} dominio={[0, 100]} data={[{ nome: 'Conferidos', antes: conf.calc(ta), depois: conf.calc(td) }]} />
          </div>
          <div>
            <p className="mb-1 text-[13px] font-medium text-ink">Pedidos que chegaram com erro</p>
            <Barras altura={200} fmtV={(v) => pct(v, 2)} dominio={[0, 'auto']} data={[{ nome: 'Com erro', antes: erro.calc(ta), depois: erro.calc(td) }]} />
          </div>
        </div>
        <ComoLer>
          antes, todo pedido era conferido, mas a fila ficava tão grande que o conferente passava no automático e deixava erro escapar.
          Depois, só os pedidos com mais chance de erro (muitos itens, valor alto ou separados por alguém novo) são conferidos, com calma.
        </ComoLer>
      </Card>
    </div>
  )
}

/* =============================================================== Prazo */
function liberadosPorHora(periodo, sel) {
  const dias = diasDe(periodo)
  const set = new Set(dias.map((d) => d.i))
  const soma = Array(meta.horas.length).fill(0)
  for (const r of horario) if (set.has(r.dia) && sel.includes(r.transp)) r.lib.forEach((v, k) => (soma[k] += v / dias.length))
  return soma
}

export function Prazo({ f }) {
  const sel = f.transp === 'todos' ? meta.transportadoras.map((_, i) => i) : [Number(f.transp)]
  const sla = KPIS[0]
  const porTransp = meta.transportadoras.map((t, ci) => ({
    nome: `${t.nome} (${hora(t.corte)})`,
    antes: sla.calc(totais({ ...f, transp: String(ci) }, 'AS-IS')),
    depois: sla.calc(totais({ ...f, transp: String(ci) }, 'TO-BE')),
  }))
  const la = liberadosPorHora('AS-IS', sel)
  const ld = liberadosPorHora('TO-BE', sel)
  const ondas = meta.horas.filter((h) => h <= 20).map((h, k) => ({ nome: hora(h), antes: la[k], depois: ld[k] }))

  return (
    <div className="grid gap-4">
      <Card titulo="Depois da mudança, quase todo pedido pega o caminhão" sub="% de pedidos prontos antes da saída do caminhão, por transportadora" direita={LEGENDA}>
        <Barras fmtV={(v) => pct(v)} dominio={[0, 100]} data={porTransp} />
        <ComoLer>
          cada transportadora tem um caminhão que sai num horário fixo (entre parênteses). A Alfa Log, que sai mais cedo, era a mais prejudicada:
          os pedidos dela entravam na mesma fila dos pedidos que só sairiam à noite.
        </ComoLer>
      </Card>

      <Card titulo="O motivo: antes os pedidos chegavam todos de uma vez" sub="Média de pedidos liberados para o armazém em cada hora do dia" direita={LEGENDA}>
        <Barras altura={240} rotulos={false} fmtV={(v) => fmt(v)} data={ondas} />
        <ComoLer>
          as barras cinza são as ondas fixas de antes: picos enormes às 6h, 8h, 10h… e nada no intervalo. Esse pico entupia o armazém.
          As barras azuis mostram a liberação nova, em lotes menores e na ordem de saída dos caminhões.
        </ComoLer>
      </Card>
    </div>
  )
}

/* =============================================================== Gargalos */
const ETAPAS = { picking: 'Separação', consolidacao: 'Juntar itens', packing: 'Embalagem', conferencia: 'Conferência', etiqueta: 'Etiqueta', sorting: 'Separar por rota' }

export function Gargalos({ f }) {
  const ta = totais(f, 'AS-IS')
  const td = totais(f, 'TO-BE')
  const por = (t, e) => t[`w_${e}`] / (e === 'conferencia' ? t.conf : t.ped)
  const dados = meta.etapas_wip.map((e) => ({ nome: ETAPAS[e], antes: por(ta, e), depois: por(td, e) }))
  const espera = (t) => meta.etapas_wip.reduce((s, e) => s + t[`w_${e}`] / t.ped, 0) // total por pedido
  const kp = KPIS.find((k) => k.id === 'prod')
  const zonas = meta.zonas.map((z, zi) => {
    const calc = (periodo) => {
      const set = new Set(diasDe(periodo).map((d) => d.i))
      let it = 0
      let h = 0
      for (const r of produtividade) if (set.has(r.dia) && r.zona === zi && (f.turno === 'todos' || r.turno === Number(f.turno))) { it += r.itens; h += r.horas }
      return it / h
    }
    return { nome: `Zona ${z}`, antes: calc('AS-IS'), depois: calc('TO-BE') }
  })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card titulo={`Cada pedido passa ${fmt(espera(ta) - espera(td))} minutos a menos parado na fila`} sub="Minutos que um pedido espera antes de começar cada etapa (média)" direita={LEGENDA}>
        <Barras deitado altura={300} fmtV={(v) => `${fmt(v)} min`} data={dados} />
        <ComoLer>
          barra comprida = pedido parado esperando a vez. Antes, o pedido esperava {fmt(dados[0].antes)} minutos só para começar a separação e ainda pegava fila na
          impressora de etiquetas, que era uma só para várias bancadas. Depois, cada posto tem a sua impressora e essa fila sumiu. A fila da conferência continua
          parecida, mas agora vale só para 1 em cada 5 pedidos.
        </ComoLer>
      </Card>
      <Card titulo={`Cada pessoa separa mais itens por hora: ${fmt(kp.calc(ta))} → ${fmt(kp.calc(td))}`} sub="Itens separados por hora, por área do armazém" direita={LEGENDA}>
        <Barras altura={300} fmtV={(v) => fmt(v)} dominio={[0, 150]} data={zonas} />
        <ComoLer>
          o armazém é dividido em 4 áreas (zonas). Antes, a lista de separação vinha na ordem dos pedidos e a pessoa cruzava o armazém várias vezes.
          Agora cada um fica numa zona e a lista segue a ordem das prateleiras. Ninguém passou a correr mais: a caminhada ficou menor.
        </ComoLer>
      </Card>
    </div>
  )
}

/* =============================================================== Qualidade */
const TIPOS = [['e_item_errado', 'Item errado'], ['e_faltando', 'Item faltando'], ['e_etiqueta', 'Etiqueta ou rota'], ['e_avaria', 'Produto avariado']]

export function Qualidade({ f }) {
  const ta = totais(f, 'AS-IS')
  const td = totais(f, 'TO-BE')
  const porMil = (t, c) => (1000 * t[c]) / t.ped
  const dados = TIPOS.map(([c, nome]) => ({ nome, antes: porMil(ta, c), depois: porMil(td, c) }))
  const fmtV = (v) => fmt(v, 1)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2" titulo="Todos os tipos de erro caíram" sub="Pedidos com erro a cada 1.000 pedidos enviados" direita={LEGENDA}>
        <Barras altura={280} fmtV={fmtV} data={dados} />
        <ComoLer>
          os erros de etiqueta quase sumiram porque cada posto ganhou a sua impressora (antes, etiquetas de pedidos diferentes se misturavam).
          Os de item errado e faltando caíram porque a conferência passou a focar nos pedidos com mais risco.
        </ComoLer>
      </Card>
      <Card titulo="Em números">
        <dl className="grid gap-3 text-[13.5px]">
          {[
            ['Pedidos enviados', ta.ped, td.ped],
            ['Pedidos conferidos', ta.conf, td.conf],
            ['Erros barrados na conferência', ta.ret, td.ret],
            ['Erros que chegaram ao cliente', ta.err, td.err],
          ].map(([rot, a, d]) => (
            <div key={rot} className="border-b border-line pb-2.5">
              <dt className="text-ink-2">{rot}</dt>
              <dd className="tnum mt-0.5 flex items-baseline gap-2">
                <span className="text-muted">{fmt(a)}</span>
                <span aria-hidden className="text-muted">→</span>
                <span className="font-semibold text-ink">{fmt(d)}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          A conferência passou a olhar 5 vezes menos pedidos, e mesmo assim chegaram ao cliente menos da metade dos erros de antes.
        </p>
      </Card>
    </div>
  )
}
