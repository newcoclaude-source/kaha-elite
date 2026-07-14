"use server";

// Server Actions — todas as ESCRITAS do B3 passam por aqui.

import { revalidatePath } from "next/cache";
import {
  atualizarAluno,
  criarAluno,
  desativarAluno,
  type DadosAluno,
} from "@/lib/kaha/alunos";
import { salvarFicha, type ExercicioInput } from "@/lib/kaha/fichas";

export type ResultadoSalvarAluno =
  | { ok: true; id: string }
  | { ok: false; erro: string };

export async function salvarAlunoAction(
  id: string | null,
  dados: DadosAluno,
): Promise<ResultadoSalvarAluno> {
  const nome = dados.nome?.trim();
  if (!nome) return { ok: false, erro: "Informe o nome do aluno." };

  try {
    const res = id
      ? await atualizarAluno(id, dados)
      : await criarAluno(dados);
    revalidatePath("/alunos");
    revalidatePath(`/alunos/${res.id}`);
    return { ok: true, id: res.id };
  } catch {
    return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  }
}

export async function desativarAlunoAction(
  id: string,
): Promise<{ ok: boolean }> {
  try {
    await desativarAluno(id);
    revalidatePath("/alunos");
    revalidatePath(`/alunos/${id}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function salvarFichaAction(
  alunoId: string,
  dados: {
    objetivo?: string | null;
    divisao?: string | null;
    exercicios: ExercicioInput[];
  },
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await salvarFicha(alunoId, dados);
    revalidatePath(`/alunos/${alunoId}`);
    revalidatePath(`/alunos/${alunoId}/ficha`);
    revalidatePath("/alunos");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível salvar a ficha." };
  }
}
