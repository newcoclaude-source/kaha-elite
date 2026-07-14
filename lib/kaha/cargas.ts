// Camada de dados das cargas / execução da sessão (B4). Roda no servidor.

import { createClient } from "@/lib/supabase/server";
import { obterFicha } from "@/lib/kaha/fichas";
import type { EstadoSessao } from "@/lib/kaha/ui";

export type RegistroSerie = {
  serie: number;
  reps: number | null;
  carga: number | null;
};

export type UltimaCarga = {
  carga: number | null;
  reps: number | null;
  data: string;
};

export type ExercicioExecucao = {
  id: string; // id do exercício da ficha (ficha_exercicio_id)
  nome: string;
  series_meta: number | null;
  reps_alvo: string | null;
  carga_alvo: string | null;
  registros: RegistroSerie[];
  ultima: UltimaCarga | null; // última vez em sessão anterior
};

export type ExecucaoSessao = {
  sessao: {
    id: string;
    estado: EstadoSessao;
    aluno_id: string;
    aluno_nome: string;
    aluno_objetivo: string | null;
    ficha_objetivo: string | null;
  };
  exercicios: ExercicioExecucao[];
};

// Última carga registrada por exercício (por NOME — sobrevive à edição da ficha).
// exceto: ignora as cargas de uma sessão específica (para a dica "da última vez").
export async function ultimaCargaPorExercicio(
  alunoId: string,
  exceto?: string,
): Promise<Map<string, UltimaCarga>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_cargas")
    .select("exercicio, reps, peso_kg, registrado_em, sessao_id")
    .eq("aluno_id", alunoId)
    .not("peso_kg", "is", null)
    .order("registrado_em", { ascending: false });
  if (error) throw error;

  const map = new Map<string, UltimaCarga>();
  for (const c of data ?? []) {
    if (exceto && c.sessao_id === exceto) continue;
    const chave = (c.exercicio ?? "").toLowerCase();
    if (!chave || map.has(chave)) continue;
    map.set(chave, {
      carga: c.peso_kg,
      reps: c.reps,
      data: c.registrado_em,
    });
  }
  return map;
}

export async function obterCargasDaSessao(
  sessaoId: string,
): Promise<ExecucaoSessao | null> {
  const supabase = createClient();

  const { data: s, error } = await supabase
    .from("kaha_sessoes")
    .select("id, estado, aluno_id, aluno:kaha_alunos(id, nome, objetivo)")
    .eq("id", sessaoId)
    .maybeSingle();
  if (error) throw error;
  if (!s || !s.aluno_id) return null;

  const alunoEmbed = Array.isArray(s.aluno) ? s.aluno[0] : s.aluno;
  const aluno = alunoEmbed as { id: string; nome: string; objetivo: string | null } | null;

  const ficha = await obterFicha(s.aluno_id);

  const { data: cargas, error: e2 } = await supabase
    .from("kaha_cargas")
    .select("ficha_exercicio_id, serie, reps, peso_kg")
    .eq("sessao_id", sessaoId);
  if (e2) throw e2;

  // Agrupa cargas registradas por exercício da ficha → série.
  const porExercicio = new Map<string, RegistroSerie[]>();
  for (const c of cargas ?? []) {
    if (!c.ficha_exercicio_id || c.serie == null) continue;
    const arr = porExercicio.get(c.ficha_exercicio_id) ?? [];
    arr.push({ serie: c.serie, reps: c.reps, carga: c.peso_kg });
    porExercicio.set(c.ficha_exercicio_id, arr);
  }

  const ultima = await ultimaCargaPorExercicio(s.aluno_id, sessaoId);

  const exercicios: ExercicioExecucao[] = (ficha?.exercicios ?? []).map((e) => ({
    id: e.id,
    nome: e.nome,
    series_meta: e.series,
    reps_alvo: e.reps_alvo,
    carga_alvo: e.carga_alvo,
    registros: (porExercicio.get(e.id) ?? []).sort((a, b) => a.serie - b.serie),
    ultima: ultima.get(e.nome.toLowerCase()) ?? null,
  }));

  return {
    sessao: {
      id: s.id,
      estado: s.estado as EstadoSessao,
      aluno_id: s.aluno_id,
      aluno_nome: aluno?.nome ?? "Aluno",
      aluno_objetivo: aluno?.objetivo ?? null,
      ficha_objetivo: ficha?.ficha.objetivo ?? null,
    },
    exercicios,
  };
}

export async function registrarCarga(dados: {
  sessao_id: string;
  exercicio_id: string;
  serie: number;
  reps: number | null;
  carga: number | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("kaha_registrar_carga", {
    p_sessao_id: dados.sessao_id,
    p_exercicio_id: dados.exercicio_id,
    p_serie: dados.serie,
    p_reps: dados.reps,
    p_carga: dados.carga,
  });
  if (error) throw error;
}
