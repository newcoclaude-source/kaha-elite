"use server";

// Server Actions das sessões + registro de carga. Validações ficam na camada
// de dados (server); aqui só orquestramos e revalidamos.

import { revalidatePath } from "next/cache";
import { marcarSessao, mudarEstado } from "@/lib/kaha/sessoes";
import { registrarCarga } from "@/lib/kaha/cargas";
import type { EstadoSessao } from "@/lib/kaha/ui";

export async function marcarSessaoAction(dados: {
  aluno_id: string;
  professor_id: string;
  dia: number;
  hora: string;
  semana_ref: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const res = await marcarSessao(dados);
  if (res.ok) {
    revalidatePath("/sessoes");
    revalidatePath("/alunos");
  }
  return res.ok ? { ok: true } : { ok: false, erro: res.erro };
}

export async function mudarEstadoAction(
  sessaoId: string,
  novo: EstadoSessao,
): Promise<{ ok: boolean; erro?: string }> {
  const res = await mudarEstado(sessaoId, novo);
  if (res.ok) {
    revalidatePath("/sessoes");
    revalidatePath(`/sessoes/${sessaoId}/executar`);
    // 'realizada' muda o semáforo de uso do aluno.
    revalidatePath("/alunos");
  }
  return res;
}

export async function registrarCargaAction(dados: {
  sessao_id: string;
  exercicio_id: string;
  serie: number;
  reps: number | null;
  carga: number | null;
}): Promise<{ ok: boolean }> {
  try {
    await registrarCarga(dados);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
