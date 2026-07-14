// Camada de dados dos alunos (B3). Roda no servidor.
// Consome a view kaha_alunos_semaforo (não recalcula a lógica de uso).

import { createClient } from "@/lib/supabase/server";
import { obterFicha, type Exercicio, type Ficha } from "@/lib/kaha/fichas";
import type { Semaforo } from "@/lib/kaha/ui";
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
