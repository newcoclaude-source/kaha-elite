// Camada de dados das sessões da semana (B4). Roda no servidor.
// Validações de estado e de slot livre acontecem AQUI, não na UI.

import { createClient } from "@/lib/supabase/server";
import type { EstadoSessao, Semaforo } from "@/lib/kaha/ui";

export type SessaoBoard = {
  id: string;
  estado: EstadoSessao;
  dia_semana: number;
  hora: string; // "HH:MM"
  semana_ref: string;
  agendada_para: string | null;
  aluno_id: string | null;
  aluno_nome: string;
  professor_id: string | null;
  professor_nome: string;
};

export type AlunoFila = {
  id: string;
  nome: string;
  semaforo: Semaforo;
  sessoes_4sem: number;
};

export type SlotLivre = {
  professor_id: string;
  professor_nome: string;
  dia_semana: number;
  hora: string; // "HH:MM"
};

export type ResultadoMarcar =
  | { ok: true; id: string }
  | { ok: false; erro: string };

const TZ = "America/Sao_Paulo";

// Segunda-feira (ISO "YYYY-MM-DD") da semana da data, no fuso de São Paulo.
export function semanaRef(data: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(data).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=domingo
  dt.setUTCDate(dt.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return dt.toISOString().slice(0, 10);
}

// Semana deslocada N semanas (para o seletor ‹ ›).
export function semanaComOffset(semana: string, offset: number): string {
  const d = new Date(semana + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset * 7);
  return d.toISOString().slice(0, 10);
}

function normHora(hora: string): string {
  return hora.slice(0, 5);
}

// Data (YYYY-MM-DD) do dia da semana dentro da semana_ref (segunda).
function dataDoDia(semana: string, dia: number): string {
  const monday = new Date(semana + "T00:00:00Z");
  const offset = dia === 0 ? 6 : dia - 1;
  monday.setUTCDate(monday.getUTCDate() + offset);
  return monday.toISOString().slice(0, 10);
}

// Timestamp da sessão em horário de São Paulo (UTC-3, sem DST desde 2019).
function agendadaPara(semana: string, dia: number, hora: string): string {
  return new Date(`${dataDoDia(semana, dia)}T${normHora(hora)}:00-03:00`).toISOString();
}

type LinhaAluno = { id: string; nome: string } | { id: string; nome: string }[] | null;
function um<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// ── Leituras ──────────────────────────────────────────────────────────────────

export async function listarSessoesDaSemana(
  semana: string,
): Promise<SessaoBoard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_sessoes")
    .select(
      "id, estado, dia_semana, hora, semana_ref, agendada_para, aluno:kaha_alunos(id,nome), professor:kaha_professores(id,nome)",
    )
    .eq("semana_ref", semana)
    .neq("estado", "cancelada")
    .order("dia_semana", { ascending: true })
    .order("hora", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((s) => {
    const aluno = um<{ id: string; nome: string }>(s.aluno as LinhaAluno);
    const professor = um<{ id: string; nome: string }>(s.professor as LinhaAluno);
    return {
      id: s.id,
      estado: s.estado as EstadoSessao,
      dia_semana: s.dia_semana,
      hora: normHora(s.hora),
      semana_ref: s.semana_ref,
      agendada_para: s.agendada_para,
      aluno_id: aluno?.id ?? null,
      aluno_nome: aluno?.nome ?? "Aluno",
      professor_id: professor?.id ?? null,
      professor_nome: professor?.nome ?? "—",
    };
  });
}

// Ids dos alunos com sessão viva (!= cancelada) na semana.
async function alunosComSessao(semana: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_sessoes")
    .select("aluno_id")
    .eq("semana_ref", semana)
    .neq("estado", "cancelada");
  if (error) throw error;
  const set = new Set<string>();
  for (const s of data ?? []) if (s.aluno_id) set.add(s.aluno_id);
  return set;
}

export async function listarAlunosSemSessao(
  semana: string,
): Promise<AlunoFila[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_alunos_semaforo")
    .select("id, nome, semaforo, sessoes_4sem")
    .eq("ativo", true)
    .order("sessoes_4sem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;

  const ocupados = await alunosComSessao(semana);
  return (data ?? [])
    .filter((a) => !ocupados.has(a.id))
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      semaforo: a.semaforo as Semaforo,
      sessoes_4sem: a.sessoes_4sem ?? 0,
    }));
}

export async function horariosLivres(semana: string): Promise<SlotLivre[]> {
  const supabase = createClient();

  const { data: horarios, error } = await supabase
    .from("kaha_horarios")
    .select("dia_semana, hora, professor:kaha_professores!inner(id, nome, ativo)")
    .eq("professor.ativo", true);
  if (error) throw error;

  const { data: sessoes, error: e2 } = await supabase
    .from("kaha_sessoes")
    .select("professor_id, dia_semana, hora")
    .eq("semana_ref", semana)
    .neq("estado", "cancelada");
  if (e2) throw e2;

  const ocupado = new Set<string>();
  for (const s of sessoes ?? []) {
    ocupado.add(`${s.professor_id}|${s.dia_semana}|${normHora(s.hora)}`);
  }

  type Prof = { id: string; nome: string; ativo: boolean };
  type HorarioRow = { dia_semana: number; hora: string; professor: Prof | Prof[] | null };

  const livres: SlotLivre[] = [];
  for (const h of (horarios ?? []) as unknown as HorarioRow[]) {
    const prof = um<Prof>(h.professor);
    if (!prof) continue;
    const hora = normHora(h.hora);
    if (ocupado.has(`${prof.id}|${h.dia_semana}|${hora}`)) continue;
    livres.push({
      professor_id: prof.id,
      professor_nome: prof.nome,
      dia_semana: h.dia_semana,
      hora,
    });
  }

  livres.sort(
    (a, b) =>
      a.dia_semana - b.dia_semana ||
      a.hora.localeCompare(b.hora) ||
      a.professor_nome.localeCompare(b.professor_nome),
  );
  return livres;
}

// ── Escritas (com validação de servidor) ──────────────────────────────────────

export async function marcarSessao(dados: {
  aluno_id: string;
  professor_id: string;
  dia: number;
  hora: string;
  semana_ref: string;
}): Promise<ResultadoMarcar> {
  const supabase = createClient();
  const hora = normHora(dados.hora);

  // 1. slot pertence à grade do professor?
  const { data: grade, error: eg } = await supabase
    .from("kaha_horarios")
    .select("id")
    .eq("professor_id", dados.professor_id)
    .eq("dia_semana", dados.dia)
    .eq("hora", hora)
    .maybeSingle();
  if (eg) throw eg;
  if (!grade) {
    return { ok: false, erro: "Esse horário não está na grade do professor." };
  }

  // 2. slot livre nesta semana?
  const { data: ocupado, error: eo } = await supabase
    .from("kaha_sessoes")
    .select("id")
    .eq("professor_id", dados.professor_id)
    .eq("dia_semana", dados.dia)
    .eq("hora", hora)
    .eq("semana_ref", dados.semana_ref)
    .neq("estado", "cancelada")
    .maybeSingle();
  if (eo) throw eo;
  if (ocupado) return { ok: false, erro: "Esse horário já foi ocupado." };

  // 3. aluno já tem sessão nesta semana?
  const { data: jaTem, error: ej } = await supabase
    .from("kaha_sessoes")
    .select("id")
    .eq("aluno_id", dados.aluno_id)
    .eq("semana_ref", dados.semana_ref)
    .neq("estado", "cancelada")
    .maybeSingle();
  if (ej) throw ej;
  if (jaTem) return { ok: false, erro: "Esse aluno já tem sessão nesta semana." };

  const { data, error } = await supabase
    .from("kaha_sessoes")
    .insert({
      aluno_id: dados.aluno_id,
      professor_id: dados.professor_id,
      estado: "agendada",
      dia_semana: dados.dia,
      hora,
      semana_ref: dados.semana_ref,
      agendada_para: agendadaPara(dados.semana_ref, dados.dia, hora),
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = violação do índice único do slot (corrida entre dois cliques).
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, erro: "Esse horário já foi ocupado." };
    }
    throw error;
  }
  return { ok: true, id: data.id };
}

const TRANSICOES: Record<EstadoSessao, EstadoSessao[]> = {
  pendente: ["agendada", "cancelada"],
  agendada: ["confirmada", "faltou", "cancelada"],
  confirmada: ["realizada", "faltou", "cancelada"],
  realizada: ["cancelada"],
  faltou: ["cancelada"],
  cancelada: [],
};

export async function mudarEstado(
  sessaoId: string,
  novo: EstadoSessao,
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = createClient();

  const { data: sessao, error } = await supabase
    .from("kaha_sessoes")
    .select("estado")
    .eq("id", sessaoId)
    .maybeSingle();
  if (error) throw error;
  if (!sessao) return { ok: false, erro: "Sessão não encontrada." };

  const atual = sessao.estado as EstadoSessao;
  if (atual === novo) return { ok: true };
  if (!TRANSICOES[atual]?.includes(novo)) {
    return { ok: false, erro: "Transição de estado inválida." };
  }

  const patch: { estado: EstadoSessao; realizada_em?: string | null } = {
    estado: novo,
  };
  if (novo === "realizada") patch.realizada_em = new Date().toISOString();

  const { error: eu } = await supabase
    .from("kaha_sessoes")
    .update(patch)
    .eq("id", sessaoId);
  if (eu) throw eu;
  return { ok: true };
}
