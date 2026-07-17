// Motor da fila do dia da Julia. Deriva os itens dos dados de HOJE
// (America/Sao_Paulo), renderiza o template de kaha_templates e monta o contexto
// do aluno. Dedupe: 1 item por aluno/dia por prioridade. Respeita os movimentos
// (hoje todos ligados via lib/julia/config — D5 pluga sem refatorar aqui).

import { createClient } from "@/lib/supabase/server";
import { DIAS_UI } from "@/lib/kaha/grade";
import {
  horariosLivres,
  semanaRef,
  type SlotLivre,
} from "@/lib/kaha/sessoes";
import {
  diasPara,
  NOME_DIA,
  type EstadoSessao,
  type Semaforo,
} from "@/lib/kaha/ui";
import { movimentoAtivo } from "./config";
import { renderTemplate, type FilaTipo } from "./templates";

export type ContextoAluno = {
  semaforo: Semaforo;
  sessoes_4sem: number;
  preferencias: string | null;
  ultima_carga_texto: string | null;
  ultima_nota: number | null;
  elite_desde: string | null;
  sessao_semana: {
    estado: EstadoSessao;
    dia_semana: number;
    hora: string;
    professor_nome: string;
  } | null;
  treino_do_dia: string | null;
};

export type MensagemHistorico = {
  conteudo: string;
  tipo: string;
  status: string;
  created_at: string;
};

export type FilaItem = {
  aluno_id: string;
  aluno_nome: string;
  telefone: string | null; // do DESTINATÁRIO (aluno ou professor)
  destinatario: "aluno" | "professor";
  destinatario_nome: string;
  objetivo: string | null;
  tipo: FilaTipo;
  mensagem: string;
  sessao_id: string | null;
  contexto: ContextoAluno;
  historico: MensagemHistorico[];
};

const PRIORIDADE: Record<FilaTipo, number> = {
  aviso_professor: 0,
  confirmacao: 1,
  pre_treino: 1,
  pos_treino: 2,
  resgate: 3,
  renovacao: 4,
  presenca: 5,
};

const DIA_CURTO = new Map<number, string>(DIAS_UI.map((d) => [d.dia, d.label]));

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

// Flexão de gênero no resgate. Sem gênero → frase neutra (sem sumido/sumida).
function generoChamada(genero: string | null | undefined): string {
  if (genero === "m") return "sumido!";
  if (genero === "f") return "sumida!";
  return "saudade de você por aqui!";
}

function normHora(h: string): string {
  return h.slice(0, 5);
}

function fmtHojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function diaHojeSP(): number {
  const [y, m, d] = fmtHojeSP().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Início de hoje em São Paulo (para "já enviada hoje").
function inicioHojeSP(): string {
  return new Date(`${fmtHojeSP()}T00:00:00-03:00`).toISOString();
}

function eliteDesde(entrou_em: string | null): string | null {
  if (!entrou_em) return null;
  const d = diasPara(entrou_em); // entrou_em é passado → negativo
  if (d == null) return null;
  const dias = -d;
  if (dias < 0) return null;
  const meses = Math.floor(dias / 30);
  if (meses < 1) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function horariosTexto(livres: SlotLivre[], n = 2): string {
  return livres
    .slice(0, n)
    .map((s) => `${DIA_CURTO.get(s.dia_semana) ?? ""} ${s.hora} com ${s.professor_nome}`)
    .join(", ");
}

type Um<T> = T | T[] | null;
function um<T>(v: Um<T>): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function montarFilaDoDia(origin: string): Promise<FilaItem[]> {
  const supabase = createClient();
  const semana = semanaRef();
  const hoje = diaHojeSP();
  const inicioHoje = inicioHojeSP();

  const [
    tplRes,
    alunosRes,
    semaforoRes,
    sessoesRes,
    fichasRes,
    feedbacksRes,
    cargasRes,
    mensagensRes,
    livres,
  ] = await Promise.all([
    supabase.from("kaha_templates").select("tipo, conteudo"),
    supabase
      .from("kaha_alunos")
      .select("id, nome, telefone, vencimento, objetivo, preferencias, entrou_em, genero")
      .eq("ativo", true),
    supabase
      .from("kaha_alunos_semaforo")
      .select("id, semaforo, sessoes_4sem")
      .eq("ativo", true),
    supabase
      .from("kaha_sessoes")
      .select(
        "id, aluno_id, estado, dia_semana, hora, feedback_token, professor:kaha_professores(nome, telefone)",
      )
      .eq("semana_ref", semana)
      .neq("estado", "cancelada"),
    supabase
      .from("kaha_fichas")
      .select("aluno_id, objetivo, divisao, kaha_ficha_exercicios(count)")
      .eq("ativa", true),
    supabase
      .from("kaha_feedbacks")
      .select("nota_treino, created_at, sessao_id, sessao:kaha_sessoes(aluno_id)")
      .eq("origem", "aluno"),
    supabase
      .from("kaha_cargas")
      .select("aluno_id, exercicio, peso_kg, registrado_em")
      .not("peso_kg", "is", null)
      .order("registrado_em", { ascending: false }),
    supabase
      .from("kaha_mensagens")
      .select("aluno_id, tipo, conteudo, status, created_at")
      .order("created_at", { ascending: false }),
    horariosLivres(semana),
  ]);

  const T = new Map<string, string>(
    (tplRes.data ?? []).map((t) => [t.tipo, t.conteudo]),
  );
  const semMap = new Map(
    (semaforoRes.data ?? []).map((s) => [s.id, s]),
  );

  // Sessões: mapa aluno→sessão-da-semana + quem TEM sessão + as de hoje.
  type SessaoRow = NonNullable<typeof sessoesRes.data>[number];
  const sessaoSemana = new Map<string, SessaoRow>();
  const comSessao = new Set<string>();
  for (const s of sessoesRes.data ?? []) {
    if (!s.aluno_id) continue;
    comSessao.add(s.aluno_id);
    if (!sessaoSemana.has(s.aluno_id)) sessaoSemana.set(s.aluno_id, s);
  }

  // Fichas.
  const fichaMap = new Map<string, { treino: string | null }>();
  for (const f of fichasRes.data ?? []) {
    const ex = um<{ count: number }>(
      f.kaha_ficha_exercicios as Um<{ count: number }>,
    );
    const base = f.divisao || f.objetivo || null;
    const treino = base
      ? ex && ex.count > 0
        ? `${base} · ${ex.count} ${ex.count === 1 ? "exercício" : "exercícios"}`
        : base
      : null;
    if (!fichaMap.has(f.aluno_id)) fichaMap.set(f.aluno_id, { treino });
  }

  // Feedback do aluno: sessões já respondidas + última nota por aluno.
  const feedbackSessao = new Set<string>();
  const ultimaNota = new Map<string, number>();
  for (const fb of feedbacksRes.data ?? []) {
    if (fb.sessao_id) feedbackSessao.add(fb.sessao_id);
    const aluno = um<{ aluno_id: string }>(fb.sessao as Um<{ aluno_id: string }>);
    if (aluno?.aluno_id && !ultimaNota.has(aluno.aluno_id) && fb.nota_treino != null) {
      ultimaNota.set(aluno.aluno_id, fb.nota_treino);
    }
  }

  // Última carga por aluno (mais recente).
  const cargaMap = new Map<string, { exercicio: string; peso: number }>();
  for (const c of cargasRes.data ?? []) {
    if (!c.aluno_id || cargaMap.has(c.aluno_id)) continue;
    cargaMap.set(c.aluno_id, { exercicio: c.exercicio, peso: c.peso_kg });
  }

  // Mensagens: histórico por aluno + última data (para presença 3+ dias).
  const msgMap = new Map<string, MensagemHistorico[]>();
  const ultimaMsg = new Map<string, string>();
  // "Já falei com ele hoje" — separado por eixo: aluno vs aviso ao professor.
  const enviadosHojeAluno = new Set<string>();
  const avisoEnviadoHoje = new Set<string>();
  for (const m of mensagensRes.data ?? []) {
    if (!m.aluno_id) continue;
    const arr = msgMap.get(m.aluno_id) ?? [];
    arr.push(m);
    msgMap.set(m.aluno_id, arr);
    if (!ultimaMsg.has(m.aluno_id)) ultimaMsg.set(m.aluno_id, m.created_at);
    if (m.status === "enviada" && m.created_at >= inicioHoje) {
      if (m.tipo === "aviso_professor") avisoEnviadoHoje.add(m.aluno_id);
      else enviadosHojeAluno.add(m.aluno_id);
    }
  }

  function contextoDe(alunoId: string): ContextoAluno {
    const sm = semMap.get(alunoId);
    const ses = sessaoSemana.get(alunoId);
    const carga = cargaMap.get(alunoId);
    const aluno = (alunosRes.data ?? []).find((a) => a.id === alunoId);
    return {
      semaforo: (sm?.semaforo as Semaforo) ?? "risco",
      sessoes_4sem: sm?.sessoes_4sem ?? 0,
      preferencias: aluno?.preferencias ?? null,
      ultima_carga_texto: carga ? `${carga.exercicio} ${carga.peso}kg` : null,
      ultima_nota: ultimaNota.get(alunoId) ?? null,
      elite_desde: eliteDesde(aluno?.entrou_em ?? null),
      sessao_semana: ses
        ? {
            estado: ses.estado as EstadoSessao,
            dia_semana: ses.dia_semana,
            hora: normHora(ses.hora),
            professor_nome:
              um<{ nome: string }>(ses.professor as Um<{ nome: string }>)?.nome ??
              "—",
          }
        : null,
      treino_do_dia: fichaMap.get(alunoId)?.treino ?? null,
    };
  }

  function novoItem(
    alunoId: string,
    tipo: FilaTipo,
    vars: Record<string, string | null | undefined>,
    sessaoId: string | null,
  ): FilaItem | null {
    const aluno = (alunosRes.data ?? []).find((a) => a.id === alunoId);
    const tpl = T.get(tipo);
    if (!aluno || !tpl) return null;
    return {
      aluno_id: alunoId,
      aluno_nome: aluno.nome,
      telefone: aluno.telefone,
      destinatario: "aluno",
      destinatario_nome: aluno.nome,
      objetivo: aluno.objetivo,
      tipo,
      mensagem: renderTemplate(tpl, { nome: primeiroNome(aluno.nome), ...vars }),
      sessao_id: sessaoId,
      contexto: contextoDe(alunoId),
      historico: (msgMap.get(alunoId) ?? []).filter((m) => m.status === "enviada"),
    };
  }

  // Aviso ao professor — mensagem para o TELEFONE DO PROFESSOR sobre a aula de hoje.
  function novoAviso(
    alunoId: string,
    prof: { nome: string; telefone: string | null },
    vars: Record<string, string | null | undefined>,
    sessaoId: string,
  ): FilaItem | null {
    const aluno = (alunosRes.data ?? []).find((a) => a.id === alunoId);
    const tpl = T.get("aviso_professor");
    if (!aluno || !tpl) return null;
    return {
      aluno_id: alunoId,
      aluno_nome: aluno.nome,
      telefone: prof.telefone,
      destinatario: "professor",
      destinatario_nome: prof.nome,
      objetivo: aluno.objetivo,
      tipo: "aviso_professor",
      mensagem: renderTemplate(tpl, vars),
      sessao_id: sessaoId,
      contexto: contextoDe(alunoId),
      historico: [],
    };
  }

  const candidatos: FilaItem[] = [];
  const avisos: FilaItem[] = [];

  // ── Derivados de sessões de HOJE ──
  for (const s of sessoesRes.data ?? []) {
    if (s.dia_semana !== hoje || !s.aluno_id) continue;
    const ctx = fichaMap.get(s.aluno_id)?.treino ?? "treino";
    const profObj = um<{ nome: string; telefone: string | null }>(
      s.professor as Um<{ nome: string; telefone: string | null }>,
    );
    const prof = profObj?.nome ?? "seu professor";
    const carga = cargaMap.get(s.aluno_id);
    const cargaTxt = carga
      ? `${carga.peso}kg no ${carga.exercicio.toLowerCase()}`
      : "um bom peso";
    const aluno = (alunosRes.data ?? []).find((a) => a.id === s.aluno_id);

    // Aviso ao professor sobre a aula de hoje (agendada/confirmada).
    if (
      (s.estado === "agendada" || s.estado === "confirmada") &&
      profObj?.telefone &&
      aluno &&
      movimentoAtivo("aviso_professor")
    ) {
      const it = novoAviso(
        s.aluno_id,
        profObj,
        {
          professor: primeiroNome(profObj.nome),
          aluno: primeiroNome(aluno.nome),
          hora: normHora(s.hora),
          treino_do_dia: ctx,
          // frase opcional: só quando há carga registrada (senão "" → some)
          ultima_sessao: carga
            ? `Última sessão dele: ${carga.peso}kg no ${carga.exercicio.toLowerCase()}. `
            : "",
        },
        s.id,
      );
      if (it) avisos.push(it);
    }

    if (s.estado === "agendada" && movimentoAtivo("confirmacao")) {
      const it = novoItem(
        s.aluno_id,
        "confirmacao",
        { dia: NOME_DIA[hoje], hora: normHora(s.hora), professor: prof },
        s.id,
      );
      if (it) candidatos.push(it);
    }
    if (s.estado === "confirmada" && movimentoAtivo("pre_treino")) {
      const it = novoItem(
        s.aluno_id,
        "pre_treino",
        { treino_do_dia: ctx, professor: prof, ultima_carga: cargaTxt },
        s.id,
      );
      if (it) candidatos.push(it);
    }
    if (
      s.estado === "realizada" &&
      movimentoAtivo("pos_treino") &&
      !feedbackSessao.has(s.id) &&
      s.feedback_token
    ) {
      const it = novoItem(
        s.aluno_id,
        "pos_treino",
        { link_q: `${origin}/q/${s.feedback_token}` },
        s.id,
      );
      if (it) candidatos.push(it);
    }
  }

  // ── Alunos sem sessão na semana: resgate / renovação / presença ──
  const horTexto = horariosTexto(livres) || "alguns horários";
  const tresDiasAtras = new Date(Date.now() - 3 * 86_400_000).toISOString();

  for (const aluno of alunosRes.data ?? []) {
    if (comSessao.has(aluno.id)) continue;
    const treino = fichaMap.get(aluno.id)?.treino ?? "treino";
    const dias = diasPara(aluno.vencimento);

    if (dias != null && dias >= 0 && dias <= 7 && movimentoAtivo("renovacao")) {
      const it = novoItem(aluno.id, "renovacao", { dias_para_vencer: String(dias) }, null);
      if (it) candidatos.push(it);
    }
    if (livres.length > 0 && movimentoAtivo("resgate")) {
      const it = novoItem(
        aluno.id,
        "resgate",
        {
          treino_do_dia: treino,
          horarios_livres: horTexto,
          chamada: generoChamada(aluno.genero),
        },
        null,
      );
      if (it) candidatos.push(it);
    }
    const msgRecente = ultimaMsg.get(aluno.id);
    if ((!msgRecente || msgRecente < tresDiasAtras) && movimentoAtivo("presenca")) {
      const it = novoItem(aluno.id, "presenca", { treino_do_dia: treino }, null);
      if (it) candidatos.push(it);
    }
  }

  // ── Dedupe dos itens ao ALUNO: 1 por aluno, maior prioridade (menor número) ──
  const porAluno = new Map<string, FilaItem>();
  for (const it of candidatos) {
    if (enviadosHojeAluno.has(it.aluno_id)) continue; // já falou com ele hoje
    const atual = porAluno.get(it.aluno_id);
    if (!atual || PRIORIDADE[it.tipo] < PRIORIDADE[atual.tipo]) {
      porAluno.set(it.aluno_id, it);
    }
  }

  // Avisos ao professor: eixo próprio (1 por aula), fora do dedupe do aluno.
  const avisosFinais = avisos.filter((a) => !avisoEnviadoHoje.has(a.aluno_id));

  return [...porAluno.values(), ...avisosFinais].sort(
    (a, b) =>
      PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo] ||
      a.aluno_nome.localeCompare(b.aluno_nome),
  );
}
