// Camada de dados dos professores + grade de horários (B2).
// Roda no servidor: usa o client server do Supabase (anon key + sessão nos cookies).
// RLS authenticated-only cuida do acesso — nunca usamos service key aqui.
// As ESCRITAS são expostas como Server Actions em app/professores/actions.ts.

import { createClient } from "@/lib/supabase/server";
import { corProfessor } from "@/lib/kaha/cores";
import { semanaRef } from "@/lib/kaha/sessoes";
import { ordemDia, type EstadoSessao } from "@/lib/kaha/ui";

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

  // Trava: não dá pra tirar disponibilidade embaixo de uma aula já marcada.
  const { data: ocupado, error: eo } = await supabase
    .from("kaha_sessoes")
    .select("id")
    .eq("professor_id", professorId)
    .eq("dia_semana", diaSemana)
    .eq("hora", hora)
    .eq("semana_ref", semanaRef())
    .neq("estado", "cancelada")
    .maybeSingle();
  if (eo) throw eo;
  if (ocupado) throw new Error("SLOT_OCUPADO");

  const { error } = await supabase
    .from("kaha_horarios")
    .delete()
    .eq("professor_id", professorId)
    .eq("dia_semana", diaSemana)
    .eq("hora", hora);
  if (error) throw error;
}

// ── D2 (Professores redesign): detalhe com stats derivados da grade real ──────

export type AulaSemana = {
  sessao_id: string;
  dia_semana: number;
  hora: string; // "HH:MM"
  aluno_nome: string;
  estado: EstadoSessao;
  treino: string | null;
};

export type ProfessorD2 = {
  professor: Professor;
  cor: string;
  soft: string;
  horarios: { dia_semana: number; hora: string }[];
  aulas: AulaSemana[];
  nota_media: number | null;
  nota_respostas: number;
};

export async function listarProfessoresD2(): Promise<ProfessorD2[]> {
  const supabase = createClient();
  const semana = semanaRef();

  const { data: profs, error } = await supabase
    .from("kaha_professores")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  const ids = (profs ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const trintaDias = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [horRes, sesRes, fichaRes, fbRes] = await Promise.all([
    supabase
      .from("kaha_horarios")
      .select("professor_id, dia_semana, hora")
      .in("professor_id", ids),
    supabase
      .from("kaha_sessoes")
      .select("id, professor_id, aluno_id, estado, dia_semana, hora, aluno:kaha_alunos(nome)")
      .eq("semana_ref", semana)
      .in("professor_id", ids)
      .neq("estado", "cancelada"),
    supabase.from("kaha_fichas").select("aluno_id, divisao, objetivo").eq("ativa", true),
    supabase
      .from("kaha_feedbacks")
      .select("nota_treino, sessao:kaha_sessoes(professor_id)")
      .eq("origem", "aluno")
      .gte("created_at", trintaDias),
  ]);

  const norm = (h: string) => h.slice(0, 5);
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const fichaMap = new Map<string, string | null>();
  for (const f of fichaRes.data ?? []) {
    if (!fichaMap.has(f.aluno_id)) fichaMap.set(f.aluno_id, f.divisao || f.objetivo || null);
  }

  const horByProf = new Map<string, { dia_semana: number; hora: string }[]>();
  for (const h of horRes.data ?? []) {
    const arr = horByProf.get(h.professor_id) ?? [];
    arr.push({ dia_semana: h.dia_semana, hora: norm(h.hora) });
    horByProf.set(h.professor_id, arr);
  }

  const aulaByProf = new Map<string, AulaSemana[]>();
  for (const s of sesRes.data ?? []) {
    if (!s.professor_id) continue;
    const aluno = one<{ nome: string }>(s.aluno as { nome: string } | { nome: string }[] | null);
    const arr = aulaByProf.get(s.professor_id) ?? [];
    arr.push({
      sessao_id: s.id,
      dia_semana: s.dia_semana,
      hora: norm(s.hora),
      aluno_nome: aluno?.nome ?? "Aluno",
      estado: s.estado as EstadoSessao,
      treino: s.aluno_id ? fichaMap.get(s.aluno_id) ?? null : null,
    });
    aulaByProf.set(s.professor_id, arr);
  }

  const notaByProf = new Map<string, { sum: number; n: number }>();
  for (const fb of fbRes.data ?? []) {
    const prof = one<{ professor_id: string }>(
      fb.sessao as { professor_id: string } | { professor_id: string }[] | null,
    );
    if (!prof?.professor_id || fb.nota_treino == null) continue;
    const cur = notaByProf.get(prof.professor_id) ?? { sum: 0, n: 0 };
    cur.sum += fb.nota_treino;
    cur.n += 1;
    notaByProf.set(prof.professor_id, cur);
  }

  return (profs ?? []).map((p) => {
    const { cor, soft } = corProfessor(p.id);
    const nota = notaByProf.get(p.id);
    return {
      professor: p as Professor,
      cor,
      soft,
      horarios: (horByProf.get(p.id) ?? []).sort((a, b) => a.hora.localeCompare(b.hora)),
      aulas: (aulaByProf.get(p.id) ?? []).sort(
        (a, b) => ordemDia(a.dia_semana) - ordemDia(b.dia_semana) || a.hora.localeCompare(b.hora),
      ),
      nota_media: nota ? Math.round((nota.sum / nota.n) * 10) / 10 : null,
      nota_respostas: nota?.n ?? 0,
    };
  });
}
