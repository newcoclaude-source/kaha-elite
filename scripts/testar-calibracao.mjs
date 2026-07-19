// Teste do MODO CALIBRAÇÃO (a Julia entrevista o gestor). Roda a conversa real
// contra a Anthropic; o "banco" é mockado em memória mas aplica a MESMA coerção
// e whitelist do servidor (prepararSalvar) — então mostra exatamente o que a
// rota gravaria. Mostra: a conversa, os campos gravados e as 2 mensagens-resultado.
//
// Precisa da ANTHROPIC_API_KEY no ambiente (vive em .env.local / Vercel).
//   node --env-file=.env.local scripts/testar-calibracao.mjs
// Node 24.

import {
  montarSystemPromptCalibracao,
  chamarAnthropicRaw,
  prepararSalvar,
  renderExemplos,
  TOOLS_CALIBRACAO,
} from "../lib/julia/concierge.ts";

// Templates reais (de kaha_templates) — para o FECHO renderizar de verdade.
const TEMPLATES = [
  {
    tipo: "confirmacao",
    conteudo:
      "Oi {nome}! Aqui é a Julia, do time Kaha Elite 👋 Sua sessão é {dia} às {hora} com {professor}. Tá de pé?",
  },
  {
    tipo: "resgate",
    conteudo:
      "{nome}, {chamada} 😅 Seu {treino_do_dia} tá esperando aqui. Tenho esses horários livres: {horarios_livres}. Qual fica melhor?",
  },
];

const system = montarSystemPromptCalibracao({ academia_nome: "CT Kaha" });

// "Banco" mock: aplica a coerção/whitelist reais + dedup de FAQ (igual à rota).
const config = {};
const faq = [];
function pushFaq(pergunta, resposta) {
  if (faq.some((f) => f.pergunta === pergunta)) return "já tinha";
  faq.push({ pergunta, resposta });
  return "salvo";
}
function executarTool(tu) {
  if (tu.name === "salvar_configuracao") {
    const prep = prepararSalvar(tu.input?.campo ?? "", tu.input?.valor ?? "");
    if (prep.erro) return `não salvei: ${prep.erro}`;
    if (prep.alvo === "config") {
      config[prep.coluna] = prep.valor;
      return "salvo";
    }
    return pushFaq(`limite: ${prep.resposta}`, prep.resposta);
  }
  if (tu.name === "adicionar_faq") {
    return pushFaq((tu.input?.pergunta ?? "").trim(), (tu.input?.resposta ?? "").trim());
  }
  if (tu.name === "mostrar_resultado") return renderExemplos(TEMPLATES);
  return "ferramenta desconhecida";
}

const RESPOSTAS = [
  "Bora configurar meu atendimento!",
  "Gosto de ser próxima e animada, cara de amiga do aluno.",
  "Uso muito 'Bora!' e 'Tamo junto'.",
  "Nunca prometa desconto e nunca garanta resultado.",
  "Se perguntarem preço, direciona pra nossa equipe comercial.",
  "Pra desmarcar sem perder, avisar com 12 horas. E vai atrás do aluno depois de 7 dias sem treinar.",
  "Os alunos perguntam se abre sábado (sim, das 8h às 13h) e se tem estacionamento (tem, gratuito). Acho que é isso, me mostra como ficou?",
];

console.log("=== SNAPSHOT ANTES ===\nconfig: {}\nfaq: []\n");

const messages = [];
for (const resposta of RESPOSTAS) {
  messages.push({ role: "user", content: resposta });
  console.log(`\n👤 GESTOR: ${resposta}`);

  const loop = messages.map((m) => ({ role: m.role, content: m.content }));
  let reply = "";
  for (let iter = 0; iter < 6; iter++) {
    const { blocks, erro } = await chamarAnthropicRaw(system, loop, TOOLS_CALIBRACAO);
    if (erro) {
      console.log("ERRO:", erro);
      process.exit(1);
    }
    const texto = blocks
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();
    const toolUses = blocks.filter((b) => b.type === "tool_use");
    if (!toolUses.length) {
      reply = texto;
      break;
    }
    const results = [];
    for (const tu of toolUses) {
      const out = executarTool(tu);
      if (tu.name === "mostrar_resultado") console.log("   🎬 mostrar_resultado");
      else console.log(`   💾 ${tu.name}(${JSON.stringify(tu.input)}) → ${out}`);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
    }
    loop.push({ role: "assistant", content: blocks });
    loop.push({ role: "user", content: results });
  }
  console.log(`🤖 JULIA: ${reply}`);
  messages.push({ role: "assistant", content: reply });
}

console.log("\n\n=== SNAPSHOT DEPOIS — kaha_config (o que iria pro banco) ===");
console.log(JSON.stringify(config, null, 2));
console.log("\n=== kaha_faq ===");
faq.forEach((f) => console.log(`- ${f.pergunta}  →  ${f.resposta}`));
console.log("\n=== 2 MENSAGENS-RESULTADO (templates reais) ===");
console.log(renderExemplos(TEMPLATES));
