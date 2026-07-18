// Teste do motor da Julia (lib/julia/concierge.ts) SEM subir a plataforma.
// Monta o system prompt de um config+FAQ representativos e roda as 5 mensagens
// do aceite, mostrando resposta + se virou pedido de ação (pendência).
//
// Precisa da ANTHROPIC_API_KEY no ambiente (ela vive em .env.local / Vercel —
// nunca no código). Uso:
//   node --env-file=.env.local scripts/testar-julia.mjs
// Node 24 (type-stripping do .ts nativo).

import { montarSystemPrompt, conversarComJulia } from "../lib/julia/concierge.ts";

// Config representativo de uma academia já configurada (o prod real vem do banco).
const cfg = {
  academia_nome: "CT Kaha",
  academia_horarios: "Seg a Sex 6h–22h · Sáb 8h–13h",
  tom: "proximo",
  saudacao: "Bora!, Tamo junto",
  janela_inicio: "08:00",
  janela_fim: "20:00",
  resposta_valores:
    "não informe valores; direcione com gentileza para a equipe passar os planos",
  prazo_cancelar: "12 horas",
  funcionamento: null,
};
const faq = [
  { pergunta: "Abrem sábado?", resposta: "Sim! Sábado a gente abre das 8h às 13h." },
  { pergunta: "Tem estacionamento?", resposta: "Temos estacionamento próprio e gratuito." },
  { pergunta: "limite: Prometer desconto", resposta: "Prometer desconto" },
  { pergunta: "limite: Garantir resultado", resposta: "Garantir resultado" },
  {
    pergunta: "escalacao: Para quem a Julia encaminha quando não sabe",
    resposta: "Recepção — (11) 90000-0000",
  },
];

const system = montarSystemPrompt(cfg, faq);

const CASOS = [
  { rotulo: "sugestão · preço", texto: "Quanto custa o Elite?" },
  { rotulo: "sugestão · FAQ", texto: "Abrem sábado?" },
  { rotulo: "sugestão · ação", texto: "Quero agendar avaliação" },
  { rotulo: "pedido de ação", texto: "Pode remarcar meu treino de quinta para sexta?" },
  { rotulo: "fora da base", texto: "Vocês têm piscina aquecida?" },
];

console.log("=== SYSTEM PROMPT ===\n" + system + "\n");

let ok = true;
for (const c of CASOS) {
  const r = await conversarComJulia(system, [{ role: "user", content: c.texto }]);
  if (r.erro) {
    ok = false;
    console.log(`\n[${c.rotulo}] "${c.texto}"\n  ERRO: ${r.erro}`);
    continue;
  }
  console.log(
    `\n[${c.rotulo}] "${c.texto}"\n  Julia: ${r.reply}\n  → pendência registrada? ${
      r.acao ? "SIM · " + r.acao.resumo : "não"
    }`,
  );
}
process.exit(ok ? 0 : 1);
