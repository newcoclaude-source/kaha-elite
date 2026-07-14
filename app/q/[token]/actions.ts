"use server";

// Envio do questionário do aluno — chama a RPC pública (única porta anon).
import { createClient } from "@/lib/supabase/server";

export async function responderQuestionarioAction(dados: {
  token: string;
  nota: number;
  gostou: string | null;
  mudaria: string | null;
}): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("kaha_responder_questionario", {
    p_token: dados.token,
    p_nota: dados.nota,
    p_gostou: dados.gostou,
    p_mudaria: dados.mudaria,
  });
  if (error) return { ok: false };
  return { ok: data === true };
}
