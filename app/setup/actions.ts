"use server";

// Server Actions do wizard de onboarding. Escrita sob RLS (sessão do gestor).
// Planos/professores/alunos criados aqui nascem com seed=false (dados reais).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Res = { ok: boolean; erro?: string };

export async function salvarAcademia(dados: {
  nome: string;
  horarios: string;
}): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase
    .from("kaha_config")
    .update({
      academia_nome: dados.nome.trim() || null,
      academia_horarios: dados.horarios.trim() || null,
    })
    .eq("id", true);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/setup");
  return { ok: true };
}

export async function criarPlano(dados: {
  nome: string;
  meta_semanal: number;
}): Promise<Res> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: "Dê um nome ao plano." };
  if (!Number.isInteger(dados.meta_semanal) || dados.meta_semanal < 1) {
    return { ok: false, erro: "A meta semanal precisa ser um número maior que zero." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("kaha_planos")
    .insert({ nome, meta_semanal: dados.meta_semanal, seed: false });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/setup");
  return { ok: true };
}

export async function removerPlano(id: string): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase.from("kaha_planos").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/setup");
  return { ok: true };
}

export async function criarProfessor(dados: {
  nome: string;
  especialidade: string;
}): Promise<Res> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: "Dê um nome ao professor." };
  const supabase = createClient();
  const { error } = await supabase.from("kaha_professores").insert({
    nome,
    especialidade: dados.especialidade.trim() || null,
    ativo: true,
    seed: false,
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/setup");
  return { ok: true };
}

export async function removerProfessor(id: string): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase
    .from("kaha_professores")
    .update({ ativo: false })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/setup");
  return { ok: true };
}

export type LinhaImport = {
  nome: string;
  telefone: string | null;
  plano_id: string | null;
};

// Importa em lote. meta_semanal = meta do plano (espelho p/ a capacidade do D8).
export async function importarAlunos(
  linhas: LinhaImport[],
): Promise<{ ok: boolean; inseridos: number; erro?: string }> {
  if (!linhas.length) return { ok: false, inseridos: 0, erro: "Nada para importar." };
  const supabase = createClient();

  const { data: planos, error: ep } = await supabase
    .from("kaha_planos")
    .select("id, meta_semanal");
  if (ep) return { ok: false, inseridos: 0, erro: ep.message };
  const metaDoPlano = new Map((planos ?? []).map((p) => [p.id, p.meta_semanal]));

  const rows = linhas
    .filter((l) => l.nome.trim())
    .map((l) => ({
      nome: l.nome.trim(),
      telefone: l.telefone?.trim() || null,
      plano_id: l.plano_id,
      meta_semanal: l.plano_id ? (metaDoPlano.get(l.plano_id) ?? null) : null,
      ativo: true,
      seed: false,
    }));

  const { data, error } = await supabase.from("kaha_alunos").insert(rows).select("id");
  if (error) return { ok: false, inseridos: 0, erro: error.message };
  revalidatePath("/setup");
  revalidatePath("/alunos");
  return { ok: true, inseridos: data?.length ?? 0 };
}

export async function concluirOnboarding(): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase
    .from("kaha_config")
    .update({ onboarding_concluido: true })
    .eq("id", true);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/setup");
  return { ok: true };
}
