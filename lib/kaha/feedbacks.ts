// Camada de dados dos feedbacks (B/UI-2 e UI-3). Roda no servidor.

import { createClient } from "@/lib/supabase/server";

export type Evolucao = "evoluiu" | "manteve" | "regrediu";
export type RiscoPercebido = "nao" | "talvez" | "sim";

export type FeedbackProfessor = {
  empenho: number | null;
  evolucao: Evolucao | null;
  dor_queixa: string | null;
  risco_percebido: RiscoPercebido | null;
};

// Upsert do feedback do professor (unique sessao_id+origem garante 1 por sessão).
export async function registrarFeedbackProfessor(
  sessaoId: string,
  fb: FeedbackProfessor,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("kaha_feedbacks").upsert(
    {
      sessao_id: sessaoId,
      origem: "professor",
      empenho: fb.empenho,
      evolucao: fb.evolucao,
      dor_queixa: fb.dor_queixa?.trim() || null,
      risco_percebido: fb.risco_percebido,
    },
    { onConflict: "sessao_id,origem" },
  );
  if (error) throw error;
}
