// Camada de dados dos professores + grade de horários (B2).
// Roda no servidor: usa o client server do Supabase (anon key + sessão nos cookies).
// RLS authenticated-only cuida do acesso — nunca usamos service key aqui.
// As ESCRITAS são expostas como Server Actions em app/professores/actions.ts.

import { createClient } from "@/lib/supabase/server";

export type Professor = {
  id: string;
  nome: string;
  telefone: string | null; // usado como WhatsApp na UI
  especialidade: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type Horario = {
  id: string;
  professor_id: string;
  dia_semana: number; // 0=domingo
  hora: string; // "HH:MM"
};

export type ProfessorComContagem = Professor & {
  horarios_count: number;
  sessoes_semana: number;
};

// Uma célula ocupada da agenda: sessão real (estado != pendente) num dia/hora.
export type SessaoAgenda = {
  dia_semana: number;
  hora: string; // "HH:MM"
  aluno_id: string | null;
  aluno_nome: string;
  estado: string;
};

export type DadosProfessor = {
  nome: string;
  especialidade?: string | null;
  telefone?: string | null; // WhatsApp
  ativo?: boolean;
};

// Segunda-feira (ISO "YYYY-MM-DD") da semana de referência — casa com o
// semana_ref das sessões (date_trunc('week', now()) no Postgres = segunda).
export function segundaFeira(base: Date = new Date()): string {
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );
  const day = d.getUTCDay(); // 0=domingo
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function normHora(hora: string): string {
  return hora.slice(0, 5);
}

// ── Leituras ────────────────────────────────────────────────────────────────

// Professores ativos + nº de horários na grade + nº de sessões desta semana.
export async function listarProfessores(): Promise<ProfessorComContagem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("kaha_professores")
    .select("*, horarios:kaha_horarios(count)")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;

  const professores = data ?? [];
  const ids = professores.map((p) => p.id);

  // Sessões da semana por professor (0 por enquanto — valida na B4).
  const sessoesPorProf = new Map<string, number>();
  if (ids.length > 0) {
    const { data: ses, error: e2 } = await supabase
      .from("kaha_sessoes")
      .select("professor_id")
      .in("professor_id", ids)
      .eq("semana_ref", segundaFeira())
      .neq("estado", "pendente");
    if (e2) throw e2;
    for (const s of ses ?? []) {
      if (!s.professor_id) continue;
      sessoesPorProf.set(
        s.professor_id,
        (sessoesPorProf.get(s.professor_id) ?? 0) + 1,
      );
    }
  }

  return professores.map((p) => {
    const { horarios, ...rest } = p as Professor & {
      horarios?: { count: number }[];
    };
    return {
      ...(rest as Professor),
      horarios_count: horarios?.[0]?.count ?? 0,
      sessoes_semana: sessoesPorProf.get(p.id) ?? 0,
    };
  });
}

// Professor + seus horários (para a página de detalhe / editor da grade).
export async function obterProfessor(
  id: string,
): Promise<{ professor: Professor; horarios: Horario[] } | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("kaha_professores")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: hs, error: e2 } = await supabase
    .from("kaha_horarios")
    .select("id, professor_id, dia_semana, hora")
    .eq("professor_id", id);
  if (e2) throw e2;

  const horarios: Horario[] = (hs ?? []).map((h) => ({
    id: h.id,
    professor_id: h.professor_id,
    dia_semana: h.dia_semana,
    hora: normHora(h.hora),
  }));

  return { professor: data as Professor, horarios };
}

// Sessões reais do professor nesta semana, mapeadas para células dia/hora.
// Deriva dia/hora de agendada_para. Timezone será formalizada na B4; aqui,
// como ainda não há sessões, o join só precisa provar que roda (tudo LIVRE).
export async function listarSessoesSemana(
  professorId: string,
): Promise<SessaoAgenda[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("kaha_sessoes")
    .select("id, estado, agendada_para, aluno:kaha_alunos(id, nome)")
    .eq("professor_id", professorId)
    .eq("semana_ref", segundaFeira())
    .neq("estado", "pendente")
    .not("agendada_para", "is", null);
  if (error) throw error;

  type Aluno = { id: string; nome: string };
  return (data ?? []).map((s) => {
    const row = s as unknown as {
      estado: string;
      agendada_para: string;
      aluno: Aluno | Aluno[] | null;
    };
    // PostgREST devolve o embedded como objeto (many-to-one); o typing infere
    // array por falta de tipos gerados — normalizamos os dois casos.
    const aluno = Array.isArray(row.aluno) ? row.aluno[0] ?? null : row.aluno;
    const dt = new Date(row.agendada_para);
    const hora = `${String(dt.getUTCHours()).padStart(2, "0")}:${String(
      dt.getUTCMinutes(),
    ).padStart(2, "0")}`;
    return {
      dia_semana: dt.getUTCDay(),
      hora,
      aluno_id: aluno?.id ?? null,
      aluno_nome: aluno?.nome ?? "Aluno",
      estado: row.estado,
    };
  });
}

// ── Escritas (chamadas pelas Server Actions) ─────────────────────────────────

export async function criarProfessor(dados: DadosProfessor): Promise<Professor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_professores")
    .insert({
      nome: dados.nome.trim(),
      especialidade: dados.especialidade?.trim() || null,
      telefone: dados.telefone?.trim() || null,
      ativo: dados.ativo ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Professor;
}

export async function atualizarProfessor(
  id: string,
  dados: DadosProfessor,
): Promise<Professor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_professores")
    .update({
      nome: dados.nome.trim(),
      especialidade: dados.especialidade?.trim() || null,
      telefone: dados.telefone?.trim() || null,
      ativo: dados.ativo ?? true,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Professor;
}

// Soft delete — nunca hard delete.
export async function desativarProfessor(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("kaha_professores")
    .update({ ativo: false })
    .eq("id", id);
  if (error) throw error;
}

// Toggle da grade. Idempotente: respeita o unique(professor, dia, hora).
export async function definirHorario(
  professorId: string,
  diaSemana: number,
  hora: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("kaha_horarios").upsert(
    { professor_id: professorId, dia_semana: diaSemana, hora },
    { onConflict: "professor_id,dia_semana,hora", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function removerHorario(
  professorId: string,
  diaSemana: number,
  hora: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("kaha_horarios")
    .delete()
    .eq("professor_id", professorId)
    .eq("dia_semana", diaSemana)
    .eq("hora", hora);
  if (error) throw error;
}
