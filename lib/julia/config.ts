// ISOLADO — stubs até o D5 (kaha_movimentos + kaha_config). Quando o D5 chegar,
// trocar a FONTE aqui (ler do banco) sem mexer no motor da fila nem na UI.

export type MovimentoChave =
  | "confirmacao"
  | "pre_treino"
  | "pos_treino"
  | "presenca"
  | "renovacao"
  | "resgate";

// Hoje: todos os movimentos ligados. D5 lê de kaha_movimentos.
export function movimentoAtivo(_chave: MovimentoChave): boolean {
  return true;
}

// Janela de envio fixa. D5 lê de kaha_config (janela_inicio/janela_fim).
export const JANELA_ENVIO = { inicio: "08:00", fim: "20:00" };

export function dentroDaJanela(agoraHHMM: string): boolean {
  return agoraHHMM >= JANELA_ENVIO.inicio && agoraHHMM <= JANELA_ENVIO.fim;
}
