"use server";

// Server Actions — todas as ESCRITAS do B2 passam por aqui.
// Client Components chamam estas funções; nunca falam com o Supabase direto.

import { revalidatePath } from "next/cache";
import {
  atualizarProfessor,
  criarProfessor,
  definirHorario,
  desativarProfessor,
  removerHorario,
  type DadosProfessor,
} from "@/lib/kaha/professores";

export type ResultadoSalvar =
  | { ok: true; id: string }
  | { ok: false; erro: string };

export async function salvarProfessorAction(
  id: string | null,
  dados: DadosProfessor,
): Promise<ResultadoSalvar> {
  const nome = dados.nome?.trim();
  if (!nome) return { ok: false, erro: "Informe o nome do professor." };

  try {
    const prof = id
      ? await atualizarProfessor(id, dados)
      : await criarProfessor(dados);
    revalidatePath("/professores");
    revalidatePath(`/professores/${prof.id}`);
    return { ok: true, id: prof.id };
  } catch {
    return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  }
}

export async function desativarProfessorAction(
  id: string,
): Promise<{ ok: boolean }> {
  try {
    await desativarProfessor(id);
    revalidatePath("/professores");
    revalidatePath(`/professores/${id}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function toggleHorarioAction(
  professorId: string,
  diaSemana: number,
  hora: string,
  marcar: boolean,
): Promise<{ ok: boolean }> {
  try {
    if (marcar) await definirHorario(professorId, diaSemana, hora);
    else await removerHorario(professorId, diaSemana, hora);
    revalidatePath(`/professores/${professorId}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
