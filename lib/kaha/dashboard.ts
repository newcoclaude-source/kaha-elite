// Camada de dados do Dashboard (D8). Todos os números vêm do banco — nada
// hardcoded. Roda no servidor. Reusa a lógica pronta de sessões e da fila da Julia.

import { createClient } from "@/lib/supabase/server";
import {
  listarAlunosSemSessao,
  listarSessoesDaSemana,
  semanaComOffset,
  semanaRef,
  type AlunoFila,
  type SessaoBoard,
} from "./sessoes";
import { montarFilaDoDia } from "@/lib/julia/fila";

export type SemanaBarra = { semana: string; label: string; realizadas: number };

export type ProfessorUso = {
  professor_id: string | null;
  nome: string;
  aulas: number;
};

export type DashboardData = {
  semana: string;
  sessoes: SessaoBoard[];
  fila: AlunoFila[];
  alunosAtivos: number;
  capacidade: number; // SOMA das metas semanais dos alunos ativos (não alunos×N)
  emRisco: number;
  emAmbar: number;
  maisFrioSessoes: number | null; // sessões/4sem do aluno mais frio (ativo)
  realizadas: number;
  marcadas: number; // agendada + confirmada
  porSemana: SemanaBarra[];
  sessoesPassada: number;
  usoPorProfessor: ProfessorUso[];
  filaJulia: number;
};

function labelSemana(semanaISO: string): string {
  const d = new Date(semanaISO + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
}

export async function carregarDashboard(origin: string): Promise<DashboardData> {
  const supabase = createClient();
  const semana = semanaRef();
  const semanaPassada = semanaComOffset(semana, -1);

  // 8 semanas terminando nesta (para o gráfico de barras).
  const semanas8: string[] = [];
  for (let i = 7; i >= 0; i--) semanas8.push(semanaComOffset(semana, -i));

  const [sessoes, fila, ativosRes, metasRes, semaforoRes, realizadasHistRes, passadaRes, filaJulia] =
    await Promise.all([
      listarSessoesDaSemana(semana),
      listarAlunosSemSessao(semana),
      supabase.from("kaha_alunos").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("kaha_alunos").select("meta_semanal").eq("ativo", true),
      supabase.from("kaha_alunos_semaforo").select("semaforo, sessoes_4sem").eq("ativo", true),
      supabase
        .from("kaha_sessoes")
        .select("semana_ref")
        .eq("estado", "realizada")
        .gte("semana_ref", semanas8[0]),
      supabase
        .from("kaha_sessoes")
        .select("id", { count: "exact", head: true })
        .eq("semana_ref", semanaPassada)
        .neq("estado", "cancelada"),
      montarFilaDoDia(origin).then((f) => f.length).catch(() => 0),
    ]);

  const alunosAtivos = ativosRes.count ?? 0;
  const capacidade = (metasRes.data ?? []).reduce(
    (soma, a) => soma + (a.meta_semanal ?? 0),
    0,
  );

  // Semáforo: risco/âmbar + aluno mais frio.
  let emRisco = 0;
  let emAmbar = 0;
  let maisFrioSessoes: number | null = null;
  for (const s of semaforoRes.data ?? []) {
    if (s.semaforo === "risco") emRisco += 1;
    if (s.semaforo === "ambar") emAmbar += 1;
    const n = s.sessoes_4sem ?? 0;
    if (maisFrioSessoes == null || n < maisFrioSessoes) maisFrioSessoes = n;
  }

  // Estados desta semana para o donut.
  const realizadas = sessoes.filter((s) => s.estado === "realizada").length;
  const marcadas = sessoes.filter(
    (s) => s.estado === "agendada" || s.estado === "confirmada",
  ).length;

  // Gráfico: realizadas por semana (8 buckets, zeros incluídos = honesto).
  const contagem = new Map<string, number>();
  for (const r of realizadasHistRes.data ?? []) {
    contagem.set(r.semana_ref, (contagem.get(r.semana_ref) ?? 0) + 1);
  }
  const porSemana: SemanaBarra[] = semanas8.map((s) => ({
    semana: s,
    label: labelSemana(s),
    realizadas: contagem.get(s) ?? 0,
  }));

  // Alunos por professor (aulas desta semana).
  const porProf = new Map<string, ProfessorUso>();
  for (const s of sessoes) {
    const key = s.professor_id ?? "sem";
    const cur =
      porProf.get(key) ??
      ({ professor_id: s.professor_id, nome: s.professor_nome, aulas: 0 } as ProfessorUso);
    cur.aulas += 1;
    porProf.set(key, cur);
  }
  const usoPorProfessor = [...porProf.values()].sort((a, b) => b.aulas - a.aulas);

  return {
    semana,
    sessoes,
    fila,
    alunosAtivos,
    capacidade,
    emRisco,
    emAmbar,
    maisFrioSessoes,
    realizadas,
    marcadas,
    porSemana,
    sessoesPassada: passadaRes.count ?? 0,
    usoPorProfessor,
    filaJulia,
  };
}
