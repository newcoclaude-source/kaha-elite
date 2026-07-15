"use server";

// Registro de envio (copiloto: humano envia no wa.me, aqui só marcamos).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function marcarEnviadaAction(dados: {
  aluno_id: string;
  tipo: string;
  conteudo: string;
}): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("kaha_mensagens").insert({
      aluno_id: dados.aluno_id,
      tipo: dados.tipo,
      conteudo: dados.conteudo,
      status: "enviada",
    });
    if (error) throw error;
    revalidatePath("/conversas");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
