# Expedição 4.0

Redesenho do processo de expedição de um CD de e-commerce fictício, com um dashboard em React que compara o processo **Antes (AS-IS)** e **Depois (TO-BE)**.

O projeto junta as duas pontas: o diagnóstico de processo (BPMN, Matriz GUT, 5 Porquês, Ishikawa) e a ferramenta que acompanha o resultado.

> **Todos os dados são simulados.** A empresa (LogiFlex Distribuição), as pessoas e os números são fictícios, gerados por um script Python com semente fixa. O método é o mesmo de uma operação real.

## O problema

A LogiFlex é um CD de e-commerce em Campinas, com 2 turnos e cerca de 8.000 pedidos por dia. No processo atual, **8,5 em cada 100 pedidos perdiam o horário de corte** da transportadora e ficavam para o dia seguinte.

A causa raiz não estava no ritmo das pessoas, e sim na regra de liberação: os pedidos saíam em **ondas fixas a cada 2h**, sem olhar o corte de cada transportadora. A onda das 6h misturava pedidos com corte às 11h, 16h e 21h na mesma fila, e a conferência 100% virava o gargalo logo depois de cada onda.

## O que mudou

| Mudança | Ataca |
| --- | --- |
| Ondas dinâmicas por horário de corte, a cada 15 min | Perda do corte |
| Picking por zona com rota por endereço | Rota longa |
| Conferência só de pedidos de risco (4+ itens, valor ≥ R$ 900, separador novo) + amostra de 5% | Superprocessamento |
| Caixa sugerida pelo sistema | Excesso de material |
| Impressora por posto de packing | Fila de etiqueta |
| Sorting por cor de rota | Erro de sorting |
| Painel de SLA por hora para o líder | Falta de medida |

## Resultado (30 dias AS-IS × 30 dias TO-BE)

| KPI | Meta | AS-IS | TO-BE |
| --- | --- | ---: | ---: |
| SLA de expedição | ≥ 98% | 91,5% | **99,3%** |
| Lead time interno | ≤ 4 h | 5,6 h | **2,3 h** |
| Produtividade de picking | ≥ 120 itens/h | 93 | **122** |
| Taxa de erro | ≤ 0,3% | 0,61% | **0,27%** |
| Taxa de conferência | 15% a 25% | 100% | **20,8%** |
| Backlog no fim do turno | ≤ 2% do volume | 11,0% | 4,0% |
| Absenteísmo | ≤ 5% | 6,0% | 4,5% |

**O achado mais interessante:** conferir menos pedidos, só os de risco, **reduziu o erro em 56%** em vez de aumentar. No AS-IS a fila da conferência estourava nos picos de onda e o conferente bipava no automático. No TO-BE ela confere com calma só o que de fato erra.

**Nem toda meta foi batida:** o backlog no fim do turno caiu de 11% para 4%, mas a meta era 2%. A próxima iteração seria congelar a liberação nos últimos 30 minutos de cada turno.

## O dashboard

Feito para ser entendido por quem não é da área. Todo gráfico mostra **Antes (cinza) e Depois (azul) lado a lado**, tem um título que já diz a conclusão e uma linha "Como ler". Dá para filtrar por turno e por transportadora.

| Tela | O que mostra |
| --- | --- |
| Resumo | O projeto em 1 minuto: problema, causa, solução, resultado e um mini-glossário |
| Indicadores | Os 7 KPIs em linguagem simples, antes e depois, com semáforo contra a meta |
| Prazo | Pedidos no prazo por transportadora e as ondas de liberação que causavam o atraso |
| Gargalos | Quanto tempo o pedido fica parado em cada etapa e itens separados por hora |
| Qualidade | Erros por tipo e como conferir menos reduziu o erro |
| Estudo de caso | BPMN AS-IS e TO-BE, Matriz GUT, 5 Porquês, Ishikawa e hipótese × resultado |

## A base simulada

`scripts/gerar_base.py` (só biblioteca padrão, semente 42) simula 60 dias de operação: cerca de 478 mil pedidos.

Cada pedido passa por **filas reais**: vários atendentes por etapa, presença diária com faltas, paradas eventuais (queda de sistema), ruptura no picking e erros com probabilidade por tipo. Os gargalos não foram desenhados à mão: eles aparecem porque a regra de liberação muda.

- Volume entre 7.000 e 9.000 pedidos/dia, com pico na segunda-feira e no início do mês
- 3 transportadoras com cortes às 11h, 16h e 21h
- 4 tabelas: `pedidos`, `eventos`, `erros`, `colaboradores`

```bash
python scripts/gerar_base.py              # gera src/data/dataset.json + amostra em data/amostra/
python scripts/gerar_base.py --completo   # também grava as 4 tabelas completas em data/base/ (grande)
```

A amostra em `data/amostra/` traz 400 pedidos do primeiro dia de cada período, com todos os eventos, erros e a equipe do dia.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ (deploy na Vercel via vercel.json)
```

**Stack:** React 18 + Vite, Tailwind CSS 4, Recharts, Python 3 para os dados.

## Estrutura

```
scripts/gerar_base.py     simulação e agregação dos dados
src/data/dataset.json     dados agregados que o dashboard lê
src/lib/data.js           filtros, KPIs e formatação
src/pages/Telas.jsx       Resumo e as telas do dashboard
src/pages/EstudoCaso.jsx  BPMN em SVG, GUT, 5 Porquês, Ishikawa
data/amostra/             amostra das 4 tabelas em CSV
```
