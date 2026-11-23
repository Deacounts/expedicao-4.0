#!/usr/bin/env python3
"""
Expedição 4.0 — gerador da base fictícia.

Simula 60 dias de expedição de um CD de e-commerce fictício (LogiFlex Distribuição):
30 dias AS-IS (ondas fixas, conferência 100%) seguidos de 30 dias TO-BE
(ondas dinâmicas por corte, conferência por risco).

Cada pedido passa por filas reais (FIFO, vários atendentes por etapa), então os
gargalos aparecem sozinhos: quem trava o fluxo é a regra de liberação, não o ritmo
das pessoas. Semente fixa → o resultado é sempre o mesmo.

Uso:
    python scripts/gerar_base.py              # dataset do dashboard + amostra CSV
    python scripts/gerar_base.py --completo   # também grava as 4 tabelas completas em data/base/

Só usa a biblioteca padrão do Python.
"""
from __future__ import annotations

import argparse
import csv
import heapq
import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 42
INICIO = date(2026, 8, 1)
DIAS_POR_PERIODO = 30
RAIZ = Path(__file__).resolve().parent.parent

TRANSPORTADORAS = [
    # corte = horário de saída do caminhão; janela_fim = último horário em que entra pedido para o corte do dia
    {"id": "alfa", "nome": "Alfa Log", "corte": 11.0, "share": 0.30, "backlog_noite": 0.70, "janela_fim": 8.0},
    {"id": "beta", "nome": "Beta Express", "corte": 16.0, "share": 0.40, "backlog_noite": 0.22, "janela_fim": 13.5},
    {"id": "gama", "nome": "Gama Cargas", "corte": 21.0, "share": 0.30, "backlog_noite": 0.10, "janela_fim": 18.5},
]
ZONAS = ["A", "B", "C", "D"]
ZONA_SHARE = [0.40, 0.30, 0.20, 0.10]
ZONA_FATOR = {"A": 1.08, "B": 1.00, "C": 0.95, "D": 0.90}  # zona A = alto giro, perto da doca
TURNOS = [("Manhã", 6.0, 14.0), ("Tarde", 14.0, 22.0)]
ITENS_DIST = [(1, 0.60), (2, 0.20), (3, 0.10), (4, 0.04), (5, 0.025), (6, 0.015), (8, 0.012), (10, 0.008)]
ETAPAS_WIP = ["picking", "consolidacao", "packing", "conferencia", "etiqueta", "sorting"]
JANELA_DOCA = 2.0
RUPTURA = 0.012  # pedidos que encontram o endereço de picking vazio
HORAS = list(range(6, 24))  # 6h … 23h (23 = 23h ou depois)

PARAMS = {
    "AS-IS": {
        "equipe": {"separador": 25, "embalador": 32, "conferente": 22, "expedidor": 10},
        "novos_separadores": 2,
        "itens_h": 95.0,          # itens/hora por separador (lista por ordem de pedido)
        "pack": (1.45, 0.33),     # min: base + por item (caixa no olho)
        "conf": (0.90, 0.35),     # min: base + por item
        "impressoras": 5,         # impressora compartilhada por bancada
        "etq": 0.42,              # min por etiqueta
        "sort": 0.70,             # min por volume (leitura manual)
        "consol": (0.15, 0.70),   # h de espera na bancada (multi-item)
        "ausencia": 0.055,
        "erro_pick": 0.0042, "erro_avaria": 0.0016, "erro_etq": 0.0022, "erro_sort": 0.0015,
        "deteccao": (0.75, 0.35),  # detecção da conferência: normal → sob pico
    },
    "TO-BE": {
        "equipe": {"separador": 22, "embalador": 27, "conferente": 6, "expedidor": 9},
        "novos_separadores": 2,
        "itens_h": 124.0,         # picking por zona com rota por endereço
        "pack": (1.25, 0.28),     # caixa sugerida pelo sistema
        "conf": (0.85, 0.33),
        "impressoras": None,      # impressora por posto de packing
        "etq": 0.30,
        "sort": 0.45,             # sorting por cor de rota
        "consol": (0.05, 0.25),
        "ausencia": 0.042,
        "erro_pick": 0.0016, "erro_avaria": 0.0007, "erro_etq": 0.0002, "erro_sort": 0.0003,
        "deteccao": (0.93, 0.93),
        "risco_itens": 4, "risco_valor": 900.0, "amostra": 0.05,
        "slot": 0.25,             # ondas dinâmicas a cada 15 min
        "folga_liberacao": 1.0,
        "horizonte": 4.5,         # h antes do corte em que o pedido entra na fila de liberação
    },
}


# ---------------------------------------------------------------- utilitários

def escolher(rng, pares):
    r = rng.random()
    acc = 0.0
    for valor, p in pares:
        acc += p
        if r < acc:
            return valor
    return pares[-1][0]


def hhmm(h: float) -> str:
    dia = int(h // 24)
    h = h - 24 * dia
    m = int(round(h * 60))
    s = f"{m // 60:02d}:{m % 60:02d}"
    return s if dia == 0 else f"{s} (+{dia}d)"


def turno_de(h: float) -> int:
    return 0 if h < 14.0 else 1


# ---------------------------------------------------------------- equipe

def montar_equipe(rng):
    """Mesmas pessoas nos dois períodos; no TO-BE parte dos conferentes muda de função."""
    pessoas = []
    seq = 1
    asis = PARAMS["AS-IS"]["equipe"]
    for t, (nome_turno, _, _) in enumerate(TURNOS):
        for funcao, qtd in list(asis.items()) + [("lider", 1)]:
            for i in range(qtd):
                pessoas.append({"id": f"C{seq:03d}", "turno": nome_turno, "t": t,
                                "funcao": {"AS-IS": funcao}, "novo": False})
                seq += 1
    # TO-BE: realoca conferentes (e completa com 2 contratações por turno) para bater a nova equipe
    tobe = PARAMS["TO-BE"]["equipe"]
    for t, (nome_turno, _, _) in enumerate(TURNOS):
        do_turno = [p for p in pessoas if p["t"] == t]
        for p in do_turno:
            p["funcao"]["TO-BE"] = p["funcao"]["AS-IS"]
        conferentes = [p for p in do_turno if p["funcao"]["AS-IS"] == "conferente"]
        sobra = conferentes[tobe["conferente"]:]
        alvo = []
        for funcao in ("separador", "embalador", "expedidor"):
            alvo += [funcao] * (tobe[funcao] - asis[funcao])
        while len(sobra) < len(alvo):  # contratações novas só no TO-BE
            novo = {"id": f"C{seq:03d}", "turno": nome_turno, "t": t, "funcao": {"AS-IS": None}, "novo": False}
            seq += 1
            pessoas.append(novo)
            sobra.append(novo)
        for p, funcao in zip(sobra, alvo):
            p["funcao"]["TO-BE"] = funcao
        for p in sobra[len(alvo):]:
            p["funcao"]["TO-BE"] = None
    # separadores novos (menos de 30 dias de casa) e zonas no TO-BE
    for periodo in ("AS-IS", "TO-BE"):
        for t in range(len(TURNOS)):
            seps = [p for p in pessoas if p["t"] == t and p["funcao"].get(periodo) == "separador"]
            for p in rng.sample(seps, PARAMS[periodo]["novos_separadores"]):
                p.setdefault("novo_em", set()).add(periodo)
            if periodo == "TO-BE":
                pesos = [8, 7, 5, 5]
                zonas = [z for z, n in zip(ZONAS, pesos) for _ in range(n)]
                for p, z in zip(seps, zonas + ["A"] * 10):
                    p["zona"] = z
    return pessoas


# ---------------------------------------------------------------- filas

def criar_servidores(ids_por_turno):
    heap = []
    for t, (_, ini, fim) in enumerate(TURNOS):
        fim_ = fim if t == 0 else math.inf  # a tarde pode estender (hora extra)
        for sid in ids_por_turno[t]:
            heap.append((ini, fim_, sid))
    heapq.heapify(heap)
    return heap


PARADA = None  # (início, fim) de uma parada do dia: queda do WMS, manutenção da esteira…


def atender(heap, chegada, duracao_fn):
    """FIFO com vários atendentes: o pedido pega o primeiro atendente livre do turno."""
    while True:
        livre, fim, sid = heapq.heappop(heap)
        inicio = max(chegada, livre)
        if PARADA and PARADA[0] <= inicio < PARADA[1]:
            inicio = PARADA[1]
        if inicio >= fim:  # turno da manhã acabou para este atendente
            continue
        termino = inicio + duracao_fn(sid)
        heapq.heappush(heap, (termino, fim, sid))
        return inicio, termino, sid


# ---------------------------------------------------------------- simulação de um dia

def volume_do_dia(rng, d: date) -> int:
    fator_semana = [1.12, 1.03, 1.00, 0.98, 0.97, 0.93, 0.90][d.weekday()]
    fator_mes = 1.06 if d.day <= 5 else 1.0
    v = 8000 * fator_semana * fator_mes * rng.gauss(1.0, 0.025)
    return int(max(7000, min(9000, v)))


def simular_dia(rng, di: int, d: date, periodo: str, pessoas):
    global PARADA
    P = PARAMS[periodo]
    tobe = periodo == "TO-BE"
    PARADA = None
    if rng.random() < 0.25:  # 1 em cada 4 dias tem alguma parada de 20 a 75 min
        a = rng.uniform(7.0, 19.0)
        PARADA = (a, a + rng.uniform(0.33, 1.25))
    segunda = d.weekday() == 0

    # presença do dia
    presentes = {}
    for p in pessoas:
        if p["funcao"].get(periodo) is None:
            continue
        aus = P["ausencia"] + (0.02 if segunda else 0.0)
        presentes[p["id"]] = rng.random() >= aus
    por_funcao = {}
    for p in pessoas:
        f = p["funcao"].get(periodo)
        if f is None or not presentes[p["id"]]:
            continue
        por_funcao.setdefault(f, [[], []])[p["t"]].append(p["id"])
    novos = {p["id"] for p in pessoas if periodo in p.get("novo_em", set())}
    lider = {t: next(p["id"] for p in pessoas if p["t"] == t and p["funcao"].get(periodo) == "lider") for t in (0, 1)}

    # pedidos
    n = volume_do_dia(rng, d)
    pedidos = []
    for k in range(n):
        tr = escolher(rng, [(t, t["share"]) for t in TRANSPORTADORAS])
        disp = 6.0 if rng.random() < tr["backlog_noite"] else rng.uniform(6.0, tr["janela_fim"])
        itens = escolher(rng, ITENS_DIST)
        valor = round(rng.lognormvariate(math.log(115), 0.7) * (1 + 0.12 * (itens - 1)), 2)
        pedidos.append({
            "id": f"P{d:%y%m%d}{k:05d}", "k": k, "data": d, "periodo": periodo,
            "transp": tr, "corte": tr["corte"], "disp": disp, "itens": itens, "valor": valor,
            "zona": escolher(rng, list(zip(ZONAS, ZONA_SHARE))),
            "ev": {}, "wait": {},
        })

    # 1) liberação
    if not tobe:
        ondas = [6.0 + 2 * i for i in range(8)]
        for p in pedidos:
            p["lib"] = next(o for o in ondas if o >= p["disp"])
    else:
        media_itens = sum(v * w for v, w in ITENS_DIST)
        # capacidade (pedidos por slot) da etapa mais lenta do turno: picking ou packing
        cap_turno = []
        for t_ in (0, 1):
            pick = len(por_funcao["separador"][t_]) * P["itens_h"] / media_itens
            pack = len(por_funcao["embalador"][t_]) * 60 / (P["pack"][0] + P["pack"][1] * media_itens)
            cap_turno.append(min(pick, pack) * P["slot"])
        ordem = sorted(pedidos, key=lambda p: p["disp"])
        pool, i, t = [], 0, 6.0
        while i < len(ordem) or pool:
            while i < len(ordem) and ordem[i]["disp"] <= t + 1e-9:
                p = ordem[i]
                heapq.heappush(pool, (p["corte"], p["disp"], p["k"], p))
                i += 1
            cap = cap_turno[turno_de(t)] * P["folga_liberacao"]
            for _ in range(int(cap) if t < 20.75 else len(pool)):
                if not pool or (pool[0][0] - t > P["horizonte"] and t < 20.75):
                    break  # só libera o que tem corte dentro do horizonte
                heapq.heappop(pool)[3]["lib"] = t
            t += P["slot"]
    for p in pedidos:
        p["ev"]["liberacao"] = (p["disp"], p["lib"], lider[turno_de(p["lib"])])

    # 2) picking (lista por ordem de pedido no AS-IS → ordem de chegada na fila = id)
    heap = criar_servidores(por_funcao["separador"])
    for p in sorted(pedidos, key=lambda p: (p["lib"], p["k"])):
        dur = lambda sid, p=p: p["itens"] / (P["itens_h"] * ZONA_FATOR[p["zona"]]) * rng.lognormvariate(0, 0.18) * (1.15 if sid in novos else 1.0)
        ini, fim, sid = atender(heap, p["lib"], dur)
        p["ev"]["picking"] = (ini, fim, sid)
        p["wait"]["picking"] = ini - p["lib"]
        p["sep"] = sid
        p["pick_h"] = fim - ini
        # 3) consolidação: multi-item espera o último item na bancada
        if p["itens"] > 1:
            a, b = P["consol"]
            p["cons_fim"] = fim + rng.uniform(a, b)
        else:
            p["cons_fim"] = fim
        if rng.random() < RUPTURA:  # endereço vazio: espera reabastecimento
            p["cons_fim"] += rng.uniform(1.5, 4.5)
        p["wait"]["consolidacao"] = p["cons_fim"] - fim

    # 4) packing
    heap = criar_servidores(por_funcao["embalador"])
    base, por_item = P["pack"]
    for p in sorted(pedidos, key=lambda p: (p["cons_fim"], p["k"])):
        ini, fim, sid = atender(heap, p["cons_fim"], lambda sid, p=p: (base + por_item * p["itens"]) / 60 * rng.lognormvariate(0, 0.15))
        p["ev"]["packing"] = (ini, fim, sid)
        p["wait"]["packing"] = ini - p["cons_fim"]
        p["emb"] = sid

    # erros na origem
    for p in pedidos:
        novo = p["sep"] in novos
        p_pick = P["erro_pick"] * p["itens"] ** 0.6 * (2.2 if novo else 1.0)
        p["erro"] = None
        p["erro_origem"] = None
        if rng.random() < p_pick:
            p["erro"] = "item_errado" if rng.random() < 0.55 else "faltando"
            p["erro_origem"] = "picking"
        elif rng.random() < P["erro_avaria"]:
            p["erro"], p["erro_origem"] = "avaria", "packing"
        # 5) decisão de conferência
        if tobe:
            risco = p["itens"] >= P["risco_itens"] or p["valor"] >= P["risco_valor"] or novo
            p["conferir"] = risco or rng.random() < P["amostra"]
            p["risco"] = risco
        else:
            p["conferir"] = True
            p["risco"] = False

    # 6) conferência
    heap = criar_servidores(por_funcao["conferente"])
    base, por_item = P["conf"]
    det_normal, det_pico = P["deteccao"]
    p["retido"] = False
    for p in sorted(pedidos, key=lambda p: (p["ev"]["packing"][1], p["k"])):
        p["retido"] = False
        chegada = p["ev"]["packing"][1]
        if not p["conferir"]:
            p["conf_fim"] = chegada
            p["wait"]["conferencia"] = 0.0
            continue
        ini, fim, sid = atender(heap, chegada, lambda sid, p=p: (base + por_item * p["itens"]) / 60 * rng.lognormvariate(0, 0.15))
        espera = ini - chegada
        if p["erro"] in ("item_errado", "faltando", "avaria"):
            pressao = min(1.0, espera * 60 / 90)  # fila longa = conferência no automático
            det = det_normal - (det_normal - det_pico) * pressao
            if rng.random() < det:
                p["retido"] = True
                p["erro_retido"] = p["erro"]
                p["erro"] = None
                fim += rng.uniform(0.15, 0.35)  # retrabalho: volta, corrige, reconfere
        p["ev"]["conferencia"] = (ini, fim, sid)
        p["wait"]["conferencia"] = espera
        p["conf_fim"] = fim

    # 7) etiquetagem
    if P["impressoras"]:
        ids = [[f"IMP-{i + 1}" for i in range(P["impressoras"])], [f"IMP-{i + 1}" for i in range(P["impressoras"])]]
        heap = criar_servidores(ids)
        for p in sorted(pedidos, key=lambda p: (p["conf_fim"], p["k"])):
            ini, fim, _ = atender(heap, p["conf_fim"], lambda sid: P["etq"] / 60 * rng.lognormvariate(0, 0.2))
            p["ev"]["etiqueta"] = (ini, fim, p["emb"])
            p["wait"]["etiqueta"] = ini - p["conf_fim"]
    else:
        for p in pedidos:
            ini = p["conf_fim"]
            p["ev"]["etiqueta"] = (ini, ini + P["etq"] / 60 * rng.lognormvariate(0, 0.2), p["emb"])
            p["wait"]["etiqueta"] = 0.0
    for p in pedidos:
        if p["erro"] is None and rng.random() < P["erro_etq"]:
            p["erro"], p["erro_origem"] = "etiqueta", "etiqueta"

    # 8) sorting
    heap = criar_servidores(por_funcao["expedidor"])
    for p in sorted(pedidos, key=lambda p: (p["ev"]["etiqueta"][1], p["k"])):
        chegada = p["ev"]["etiqueta"][1]
        ini, fim, sid = atender(heap, chegada, lambda sid: P["sort"] / 60 * rng.lognormvariate(0, 0.2))
        p["ev"]["sorting"] = (ini, fim, sid)
        p["wait"]["sorting"] = ini - chegada
        p["exp"] = sid
        if p["erro"] is None and rng.random() < P["erro_sort"]:
            p["erro"], p["erro_origem"] = "etiqueta", "sorting"  # volume no caminhão errado

    # 9) carregamento: o caminhão da rota encosta JANELA_DOCA h antes do corte;
    #    volume pronto antes disso espera na doca, volume pronto depois do corte perde o caminhão
    for p in pedidos:
        p["doca"] = p["ev"]["sorting"][1] + rng.uniform(0.03, 0.10)
        if p["doca"] <= p["corte"]:
            ini = max(p["doca"], p["corte"] - JANELA_DOCA + rng.uniform(0, JANELA_DOCA - 0.25))
            fim = min(p["corte"], ini + rng.uniform(0.05, 0.20))
        else:
            ini = p["doca"]
            fim = ini + rng.uniform(0.05, 0.20)
        p["ev"]["carregamento"] = (ini, fim, p["exp"])
        p["car"] = fim
        p["no_prazo"] = fim <= p["corte"]

    equipe_dia = []
    for p in pessoas:
        if p["funcao"].get(periodo) is not None:
            equipe_dia.append((p, presentes[p["id"]]))
    return pedidos, equipe_dia


# ---------------------------------------------------------------- agregação para o dashboard

def agregar(dias):
    """dias: lista de (di, data, periodo, pedidos, equipe_dia)."""
    TR = [t["id"] for t in TRANSPORTADORAS]
    diario, horario, wip, prod, equipe = {}, {}, {}, {}, {}
    for di, d, periodo, pedidos, equipe_dia in dias:
        for p in pedidos:
            ti = turno_de(p["lib"])
            ci = TR.index(p["transp"]["id"])
            key = (di, ti, ci)
            r = diario.setdefault(key, {
                "ped": 0, "itens": 0, "ontime": 0, "lt": 0.0, "conf": 0, "err": 0, "ret": 0, "bkl": 0,
                "e_item_errado": 0, "e_faltando": 0, "e_avaria": 0, "e_etiqueta": 0,
                "f_sep": 0, "f_emb": 0, "f_etq": 0, "f_sor": 0,
                **{f"w_{e}": 0.0 for e in ETAPAS_WIP},
            })
            r["ped"] += 1
            r["itens"] += p["itens"]
            r["ontime"] += p["no_prazo"]
            r["lt"] += p["car"] - p["lib"]
            r["conf"] += p["conferir"]
            r["ret"] += p["retido"]
            if p["erro"]:
                r["err"] += 1
                r[f"e_{p['erro']}"] += 1
            r["bkl"] += p["doca"] > TURNOS[ti][2]  # liberado no turno e ainda não chegou à doca
            c = p["corte"]
            r["f_sep"] += p["ev"]["picking"][1] <= c
            r["f_emb"] += p["ev"]["packing"][1] <= c
            r["f_etq"] += p["ev"]["etiqueta"][1] <= c
            r["f_sor"] += p["ev"]["sorting"][1] <= c
            for e in ETAPAS_WIP:
                r[f"w_{e}"] += p["wait"][e] * 60

            hk = (di, ci)
            h = horario.setdefault(hk, {"lib": [0] * len(HORAS), "car": [0] * len(HORAS)})
            h["lib"][min(23, max(6, int(p["lib"]))) - 6] += 1
            h["car"][min(23, max(6, int(p["car"]))) - 6] += 1

            w = wip.setdefault(hk, [[0] * len(HORAS) for _ in ETAPAS_WIP])
            filas = {
                "picking": (p["lib"], p["ev"]["picking"][0]),
                "consolidacao": (p["ev"]["picking"][1], p["cons_fim"]),
                "packing": (p["cons_fim"], p["ev"]["packing"][0]),
                "conferencia": (p["ev"]["packing"][1], p["ev"]["conferencia"][0] if "conferencia" in p["ev"] else p["ev"]["packing"][1]),
                "etiqueta": (p["conf_fim"], p["ev"]["etiqueta"][0]),
                "sorting": (p["ev"]["etiqueta"][1], p["ev"]["sorting"][0]),
            }
            for ei, e in enumerate(ETAPAS_WIP):
                a, b = filas[e]
                for hh in range(6, 24):  # foto da fila às hh:30
                    if a <= hh + 0.5 < b:
                        w[ei][hh - 6] += 1

            zi = ZONAS.index(p["zona"])
            pk = (di, turno_de(p["ev"]["picking"][0]), zi)
            pr = prod.setdefault(pk, [0, 0.0])
            pr[0] += p["itens"]
            pr[1] += p["pick_h"]
        for pessoa, presente in equipe_dia:
            ek = (di, pessoa["t"])
            e = equipe.setdefault(ek, [0, 0])
            e[0] += 1
            e[1] += presente

    cols = ["ped", "itens", "ontime", "lt", "conf", "err", "ret", "bkl",
            "e_item_errado", "e_faltando", "e_avaria", "e_etiqueta",
            "f_sep", "f_emb", "f_etq", "f_sor"] + [f"w_{e}" for e in ETAPAS_WIP]
    out = {
        "diario": {"cols": ["dia", "turno", "transp"] + cols,
                   "rows": [[*k, *[round(v[c], 2) if isinstance(v[c], float) else v[c] for c in cols]] for k, v in sorted(diario.items())]},
        "horario": {"cols": ["dia", "transp", "lib", "car"],
                    "rows": [[*k, v["lib"], v["car"]] for k, v in sorted(horario.items())]},
        "wip": {"cols": ["dia", "transp", "filas"], "rows": [[*k, v] for k, v in sorted(wip.items())]},
        "produtividade": {"cols": ["dia", "turno", "zona", "itens", "horas"],
                          "rows": [[*k, v[0], round(v[1], 3)] for k, v in sorted(prod.items())]},
        "equipe": {"cols": ["dia", "turno", "escalados", "presentes"],
                   "rows": [[*k, *v] for k, v in sorted(equipe.items())]},
    }
    return out


def resumo(dias):
    res = {}
    for periodo in ("AS-IS", "TO-BE"):
        ped = [p for _, _, per, pedidos, _ in dias if per == periodo for p in pedidos]
        n = len(ped)
        eq = [(pp, pres) for _, _, per, _, e in dias if per == periodo for pp, pres in e]
        horas_pick = sum(p["pick_h"] for p in ped)
        bkl = sum(p["doca"] > TURNOS[turno_de(p["lib"])][2] for p in ped)
        res[periodo] = {
            "pedidos": n,
            "pedidos_dia": round(n / len({p["data"] for p in ped})),
            "sla_pct": round(100 * sum(p["no_prazo"] for p in ped) / n, 1),
            "perderam_corte_por_100": round(100 * (1 - sum(p["no_prazo"] for p in ped) / n), 1),
            "lead_time_h": round(sum(p["car"] - p["lib"] for p in ped) / n, 2),
            "itens_por_hora": round(sum(p["itens"] for p in ped) / horas_pick, 1),
            "erro_pct": round(100 * sum(1 for p in ped if p["erro"]) / n, 2),
            "conferencia_pct": round(100 * sum(p["conferir"] for p in ped) / n, 1),
            "backlog_pct": round(100 * bkl / n, 1),
            "absenteismo_pct": round(100 * sum(1 for _, pres in eq if not pres) / len(eq), 1),
            "erros_retidos": sum(p["retido"] for p in ped),
        }
    return res


# ---------------------------------------------------------------- CSV

def gravar_tabelas(pasta: Path, dias, pessoas, filtro=None):
    pasta.mkdir(parents=True, exist_ok=True)
    with open(pasta / "pedidos.csv", "w", newline="", encoding="utf-8") as fp, \
         open(pasta / "eventos.csv", "w", newline="", encoding="utf-8") as fe, \
         open(pasta / "erros.csv", "w", newline="", encoding="utf-8") as fr:
        wp, we, wr = csv.writer(fp), csv.writer(fe), csv.writer(fr)
        wp.writerow(["id", "data", "transportadora", "hora_corte", "qtd_itens", "valor", "periodo", "zona", "conferido", "no_prazo"])
        we.writerow(["pedido_id", "etapa", "inicio", "fim", "colaborador_id"])
        wr.writerow(["pedido_id", "tipo", "etapa_origem", "retido_na_conferencia"])
        for _, d, periodo, pedidos, _ in dias:
            for p in pedidos:
                if filtro and not filtro(p):
                    continue
                wp.writerow([p["id"], d.isoformat(), p["transp"]["nome"], hhmm(p["corte"]), p["itens"],
                             f"{p['valor']:.2f}", periodo, p["zona"], int(p["conferir"]), int(p["no_prazo"])])
                for etapa in ("liberacao", "picking", "packing", "conferencia", "etiqueta", "sorting", "carregamento"):
                    if etapa in p["ev"]:
                        ini, fim, sid = p["ev"][etapa]
                        we.writerow([p["id"], etapa, f"{d.isoformat()} {hhmm(ini)}", f"{d.isoformat()} {hhmm(fim)}", sid])
                if p["erro"]:
                    wr.writerow([p["id"], p["erro"], p["erro_origem"], 0])
                if p["retido"]:
                    wr.writerow([p["id"], p["erro_retido"], "picking" if p["erro_retido"] != "avaria" else "packing", 1])
    with open(pasta / "colaboradores.csv", "w", newline="", encoding="utf-8") as fc:
        wc = csv.writer(fc)
        wc.writerow(["id", "data", "periodo", "turno", "funcao", "zona", "novo", "presente"])
        for _, d, periodo, pedidos, equipe_dia in dias:
            if filtro and not any(filtro(p) for p in pedidos[:1]) and filtro is not None and not _dia_na_amostra(d):
                continue
            for p, presente in equipe_dia:
                wc.writerow([p["id"], d.isoformat(), periodo, p["turno"], p["funcao"][periodo],
                             p.get("zona", "") if periodo == "TO-BE" else "", int(periodo in p.get("novo_em", set())), int(presente)])


AMOSTRA_DIAS = {INICIO, INICIO + timedelta(days=DIAS_POR_PERIODO)}


def _dia_na_amostra(d):
    return d in AMOSTRA_DIAS


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--completo", action="store_true", help="grava as 4 tabelas completas em data/base/ (~300 MB)")
    ap.add_argument("--dias", type=int, default=DIAS_POR_PERIODO, help="dias por período (para testes rápidos)")
    args = ap.parse_args()

    rng = random.Random(SEED)
    pessoas = montar_equipe(rng)
    dias = []
    for i in range(2 * args.dias):
        periodo = "AS-IS" if i < args.dias else "TO-BE"
        d = INICIO + timedelta(days=i)
        pedidos, equipe_dia = simular_dia(rng, i, d, periodo, pessoas)
        dias.append((i, d, periodo, pedidos, equipe_dia))

    res = resumo(dias)
    dataset = {
        "meta": {
            "empresa": "LogiFlex Distribuição (fictícia)",
            "seed": SEED,
            "gerado_por": "scripts/gerar_base.py",
            "dias": [{"data": d.isoformat(), "periodo": per, "dow": d.weekday()} for _, d, per, _, _ in dias],
            "transportadoras": [{"id": t["id"], "nome": t["nome"], "corte": t["corte"]} for t in TRANSPORTADORAS],
            "turnos": [{"nome": n, "inicio": a, "fim": b} for n, a, b in TURNOS],
            "zonas": ZONAS,
            "horas": HORAS,
            "etapas_wip": ETAPAS_WIP,
            "resumo": res,
        },
        **agregar(dias),
    }
    destino = RAIZ / "src" / "data" / "dataset.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (RAIZ / "data").mkdir(exist_ok=True)
    (RAIZ / "data" / "resumo.json").write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")

    amostra_ids = set()
    for _, d, _, pedidos, _ in dias:
        if d in AMOSTRA_DIAS:
            amostra_ids.update(p["id"] for p in pedidos[:400])
    gravar_tabelas(RAIZ / "data" / "amostra", dias, pessoas, filtro=lambda p: p["id"] in amostra_ids)
    if args.completo:
        gravar_tabelas(RAIZ / "data" / "base", dias, pessoas)

    print(json.dumps(res, ensure_ascii=False, indent=2))
    print(f"\n-> {destino.relative_to(RAIZ)} ({destino.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
