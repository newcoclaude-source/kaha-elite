// Camada de dados dos alunos (B3). Roda no servidor.
// Consome a view kaha_alunos_semaforo (não recalcula a lógica de uso).

import { createClient } from "@/lib/supabase/server";
import { corProfessor } from "@/lib/kaha/cores";
import { obterFicha, type Exercicio, type Ficha } from "@/lib/kaha/fichas";
import { semanaRef } from "@/lib/kaha/sessoes";
import type { EstadoSessao, Semaforo } from "@/lib/kaha/ui";
import { normalizarWhatsapp } from "@/lib/kaha/whatsapp";

export type FiltroAluno = "todos" | "sem_ficha" | "risco" | "em_ritmo";

export type AlunoLista = {
  id: string;
  nome: string;
  telefone: string | null;
  objetivo: string | null;
  vencimento: string | null;
  valor_mensal: number | null;
  semaforo: Semaforo;
  sessoes_4sem: number;
  tem_ficha: boolean;
};

export type AlunoDetalhe = {
  id: string;
  nome: string;
  telefone: string | null;
  objetivo: string | null;
  vencimento: string | null;
  valor_mensal: number | null;
  entrou_em: string | null;
  observacoes: string | null;
  ativo: boolean;
  semaforo: Semaforo;
  sessoes_4sem: number;
};

export type DadosAluno = {
  nome: string;
  telefone?: string | null; // WhatsApp (será normalizado)
  objetivo?: string | null;
  vencimento?: string | null;
  valor_mensal?: number | null;
};

const COLS =
  "id, nome, telefone, objetivo, vencimento, valor_mensal, semaforo, sessoes_4sem";

// Carrega todos os alunos ativos (view) + marca quem tem ficha ativa.
async function carregarBase(): Promise<AlunoLista[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("kaha_alunos_semaforo")
    .select(COLS)
    .eq("ativo", true)
    .order("sessoes_4sem", { ascending: true }) // mais frios primeiro
    .order("nome", { ascending: true });
  if (error) throw error;

  const alunos = data ?? [];
  const ids = alunos.map((a) => a.id);

  const comFicha = new Set<string>();
  if (ids.length > 0) {
    const { data: fs, error: e2 } = await supabase
      .from("kaha_fichas")
      .select("aluno_id")
      .eq("ativa", true)
      .in("aluno_id", ids);
    if (e2) throw e2;
    for (const f of fs ?? []) comFicha.add(f.aluno_id);
  }

  return alunos.map((a) => ({
    id: a.id,
    nome: a.nome,
    telefone: a.telefone,
    objetivo: a.objetivo,
    vencimento: a.vencimento,
    valor_mensal: a.valor_mensal,
    semaforo: a.semaforo as Semaforo,
    sessoes_4sem: a.sessoes_4sem ?? 0,
    tem_ficha: comFicha.has(a.id),
  }));
}

export async function listarAlunos(
  { filtro = "todos" }: { filtro?: FiltroAluno } = {},
): Promise<AlunoLista[]> {
  const base = await carregarBase();
  switch (filtro) {
    case "sem_ficha":
      return base.filter((a) => !a.tem_ficha);
    case "risco":
      return base.filter((a) => a.semaforo === "risco");
    case "em_ritmo":
      return base.filter((a) => a.semaforo === "verde");
    default:
      return base;
  }
}

export async function contarAlunos(): Promise<Record<FiltroAluno, number>> {
  const base = await carregarBase();
  return {
    todos: base.length,
    sem_ficha: base.filter((a) => !a.tem_ficha).length,
    risco: base.filter((a) => a.semaforo === "risco").length,
    em_ritmo: base.filter((a) => a.semaforo === "verde").length,
  };
}

export async function obterAluno(id: string): Promise<
  | {
      aluno: AlunoDetalhe;
      ficha: Ficha | null;
      exercicios: Exercicio[];
    }
  | null
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("kaha_alunos_semaforo")
    .select(
      "id, nome, telefone, objetivo, vencimento, valor_mensal, entrou_em, observacoes, ativo, semaforo, sessoes_4sem",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const aluno: AlunoDetalhe = {
    ...(data as Omit<AlunoDetalhe, "semaforo" | "sessoes_4sem">),
    semaforo: data.semaforo as Semaforo,
    sessoes_4sem: data.sessoes_4sem ?? 0,
  };

  const ficha = await obterFicha(id);
  return {
    aluno,
    ficha: ficha?.ficha ?? null,
    exercicios: ficha?.exercicios ?? [],
  };
}

function normalizarDados(dados: DadosAluno) {
  return {
    nome: dados.nome.trim(),
    telefone: normalizarWhatsapp(dados.telefone),
    objetivo: dados.objetivo?.trim() || null,
    vencimento: dados.vencimento?.trim() || null,
    valor_mensal:
      dados.valor_mensal === null || dados.valor_mensal === undefined
        ? 1000
        : Number(dados.valor_mensal),
  };
}

export async function criarAluno(dados: DadosAluno): Promise<{ id: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_alunos")
    .insert({ ...normalizarDados(dados), ativo: true })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function atualizarAluno(
  id: string,
  dados: DadosAluno,
): Promise<{ id: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_alunos")
    .update(normalizarDados(dados))
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function desativarAluno(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("kaha_alunos")
    .update({ ativo: false })
    .eq("id", id);
  if (error) throw error;
}

// ── D1 (Alunos redesign): lista enriquecida (tabela desktop / cards mobile) ───

export type AlunoD1 = {
  id: string;
  nome: string;
  telefone: string | null;
  objetivo: string | null;
  semaforo: Semaforo;
  sessoes_4sem: number;
  tem_ficha: boolean;
  ficha_divisao: string | null;
  ficha_ex: number;
  dor_queixa: string | null;
  ultimo_treino_dias: number | null; // null = nunca treinou
  sessao_semana: {
    estado: EstadoSessao;
    dia_semana: number;
    hora: string;
    professor_nome: string;
    cor: string;
  } | null;
};

export async function listarAlunosD1(): Promise<AlunoD1[]> {
  const supabase = createClient();
  const semana = semanaRef();
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const [viewRes, fichaRes, sessRes, realRes, fbRes] = await Promise.all([
    supabase
      .from("kaha_alunos_semaforo")
      .select("id, nome, telefone, objetivo, semaforo, sessoes_4sem")
      .eq("ativo", true)
      .order("sessoes_4sem", { ascending: true })
      .order("nome", { ascending: true }),
    supabase
      .from("kaha_fichas")
      .select("aluno_id, divisao, objetivo, kaha_ficha_exercicios(count)")
      .eq("ativa", true),
    supabase
      .from("kaha_sessoes")
      .select("aluno_id, estado, dia_semana, hora, professor_id, professor:kaha_professores(nome)")
      .eq("semana_ref", semana)
      .neq("estado", "cancelada"),
    supabase
      .from("kaha_sessoes")
      .select("aluno_id, realizada_em")
      .eq("estado", "realizada")
      .not("realizada_em", "is", null)
      .order("realizada_em", { ascending: false }),
    supabase
      .from("kaha_feedbacks")
      .select("dor_queixa, created_at, sessao:kaha_sessoes(aluno_id)")
      .eq("origem", "professor")
      .not("dor_queixa", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const fichaMap = new Map<string, { divisao: string | null; ex: number }>();
  for (const f of fichaRes.data ?? []) {
    if (fichaMap.has(f.aluno_id)) continue;
    const cnt = one<{ count: number }>(
      f.kaha_ficha_exercicios as { count: number } | { count: number }[] | null,
    );
    fichaMap.set(f.aluno_id, {
      divisao: f.divisao || f.objetivo || null,
      ex: cnt?.count ?? 0,
    });
  }

  const sessMap = new Map<string, AlunoD1["sessao_semana"]>();
  for (const s of sessRes.data ?? []) {
    if (!s.aluno_id || sessMap.has(s.aluno_id)) continue;
    const prof = one<{ nome: string }>(
      s.professor as { nome: string } | { nome: string }[] | null,
    );
    sessMap.set(s.aluno_id, {
      estado: s.estado as EstadoSessao,
      dia_semana: s.dia_semana,
      hora: s.hora.slice(0, 5),
      professor_nome: prof?.nome ?? "—",
      cor: corProfessor(s.professor_id).cor,
    });
  }

  const realMap = new Map<string, string>();
  for (const r of realRes.data ?? []) {
    if (r.aluno_id && !realMap.has(r.aluno_id) && r.realizada_em) {
      realMap.set(r.aluno_id, r.realizada_em);
    }
  }

  const queixaMap = new Map<string, string>();
  for (const fb of fbRes.data ?? []) {
    const al = one<{ aluno_id: string }>(
      fb.sessao as { aluno_id: string } | { aluno_id: string }[] | null,
    );
    if (al?.aluno_id && !queixaMap.has(al.aluno_id) && fb.dor_queixa) {
      queixaMap.set(al.aluno_id, fb.dor_queixa);
    }
  }

  return (viewRes.data ?? []).map((a) => {
    const ficha = fichaMap.get(a.id);
    const real = realMap.get(a.id);
    const dias = real
      ? Math.floor((Date.now() - new Date(real).getTime()) / 86_400_000)
      : null;
    return {
      id: a.id,
      nome: a.nome,
      telefone: a.telefone,
      objetivo: a.objetivo,
      semaforo: a.semaforo as Semaforo,
      sessoes_4sem: a.sessoes_4sem ?? 0,
      tem_ficha: !!ficha,
      ficha_divisao: ficha?.divisao ?? null,
      ficha_ex: ficha?.ex ?? 0,
      dor_queixa: queixaMap.get(a.id) ?? null,
      ultimo_treino_dias: dias,
      sessao_semana: sessMap.get(a.id) ?? null,
    };
  });
}
