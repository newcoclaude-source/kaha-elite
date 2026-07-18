// Motor de conversa da Julia (Fase 3 · Teste da Julia). Módulo PURO de servidor:
// sem Next, sem Supabase — recebe config + FAQ e as mensagens, monta o system
// prompt e fala com a API da Anthropic. Testável em Node (scripts/testar-julia.mjs).
//
// Persona: "Julia, a concierge do Elite". A Julia RESPONDE mas NÃO EXECUTA:
// pedido de ação vira resposta de concierge + sinalização (a rota registra em
// kaha_julia_pendencias). Vocabulário canônico: nada de IA/bot/robô/automático.

export type ChatMsg = { role: "user" | "assistant"; content: string };
export type FaqRow = { pergunta: string; resposta: string };
export type ConciergeConfig = {
  academia_nome: string | null;
  academia_horarios: string | null;
  tom: string | null;
  saudacao: string | null;
  janela_inicio: string | null;
  janela_fim: string | null;
  resposta_valores: string | null;
  prazo_cancelar: string | null;
  funcionamento: string | null;
};

const PREF_LIMITE = "limite:";
const PREF_ESCALACAO = "escalacao:";

const TOM_DESC: Record<string, string> = {
  proximo: "próxima, calorosa e animada",
  energia: "direta, objetiva e cheia de energia",
  premium: "elegante, discreta e acolhedora",
};

function hhmm(v: string | null): string {
  return v ? v.slice(0, 5) : "";
}

export function montarSystemPrompt(cfg: ConciergeConfig, faq: FaqRow[]): string {
  const nome = cfg.academia_nome?.trim() || "CT Kaha";
  const tom = TOM_DESC[cfg.tom ?? "proximo"] ?? TOM_DESC.proximo;

  const limites = faq
    .filter((f) => f.pergunta.startsWith(PREF_LIMITE))
    .map((f) => f.resposta.trim())
    .filter(Boolean);
  const escalacao =
    faq.find((f) => f.pergunta.startsWith(PREF_ESCALACAO))?.resposta.trim() || "a nossa equipe";
  const perguntas = faq.filter(
    (f) => !f.pergunta.startsWith(PREF_LIMITE) && !f.pergunta.startsWith(PREF_ESCALACAO),
  );

  const valores =
    cfg.resposta_valores?.trim() ||
    "não informe valores; direcione com gentileza para a equipe passar os detalhes";
  const ini = hhmm(cfg.janela_inicio);
  const fim = hhmm(cfg.janela_fim);

  const linhas: string[] = [
    `Você é a Julia, a concierge do Elite do ${nome}. Você cuida da relação com os alunos com PRESENÇA: atenção de verdade, no tempo certo, como alguém do time que conhece cada aluno. Seu jeito é ${tom}.`,
    cfg.saudacao?.trim()
      ? `Expressões que combinam com você: ${cfg.saudacao.trim()}. Use com naturalidade, sem exagero.`
      : "",
    "",
    "REGRAS INEGOCIÁVEIS:",
    "- Você é uma pessoa do time, a concierge — não um sistema. NUNCA se descreva como assistente virtual, atendente automático, programa ou robô. Nunca use as palavras: IA, inteligência artificial, bot, chatbot, robô, automático, automação, disparo, CRM, software.",
    "- Você NÃO executa nada sozinha: não agenda, não marca, não remarca, não cancela e não altera a agenda. Quando o aluno pedir uma dessas ações, acolha com carinho, diga que vai confirmar com a equipe/professor e que já retorna — NUNCA afirme que já está feito ou agendado.",
    `- Nada de valores, preços ou descontos. Se perguntarem sobre preço/pagamento/desconto: ${valores}. Nunca invente números.`,
    `- Se você não souber, seja honesta: diga que vai confirmar com ${escalacao} e já retorna. Nunca invente informação sobre a academia.`,
    limites.length ? `- Você NUNCA deve: ${limites.join("; ")}.` : "",
    cfg.prazo_cancelar?.trim()
      ? `- Para desmarcar sem perder a sessão, o aluno precisa avisar com ${cfg.prazo_cancelar.trim()} de antecedência.`
      : "",
    "",
    "SOBRE A ACADEMIA:",
    `- Nome: ${nome}.`,
    cfg.academia_horarios?.trim() ? `- Horários: ${cfg.academia_horarios.trim()}.` : "",
    cfg.funcionamento?.trim() ? `- Funcionamento: ${cfg.funcionamento.trim()}.` : "",
    ini && fim ? `- Você costuma falar com os alunos entre ${ini} e ${fim}.` : "",
    "",
    "PERGUNTAS FREQUENTES (use como base quando fizer sentido; não force):",
    perguntas.length
      ? perguntas.map((p) => `P: ${p.pergunta}\nR: ${p.resposta}`).join("\n\n")
      : "(ainda sem perguntas cadastradas — nesses casos, confirme com a equipe)",
    "",
    "Responda sempre em português do Brasil, curto e humano, como uma mensagem de WhatsApp — uma ou duas frases costumam bastar. Trate o aluno por 'você'.",
  ];

  return linhas.filter((l) => l !== "").join("\n");
}

const TOOL = {
  name: "registrar_pedido",
  description:
    "Registre aqui SEMPRE que o aluno pedir uma AÇÃO operacional que você não executa: agendar, marcar, remarcar, desmarcar, cancelar, trocar horário, agendar avaliação ou aula experimental. Chame esta função ALÉM de responder ao aluno em texto (acolhendo e dizendo que vai confirmar com a equipe).",
  input_schema: {
    type: "object",
    properties: {
      resumo: {
        type: "string",
        description: "Resumo curto do pedido. Ex.: 'Agendar avaliação física'.",
      },
    },
    required: ["resumo"],
  },
};

const FALLBACK_ACAO =
  "Que ótimo que você quer isso! 🙌 Vou confirmar com a equipe e já te retorno com tudo certinho.";

export type RespostaJulia = {
  reply: string;
  acao: { resumo: string } | null;
  erro?: string;
  status?: number; // status HTTP devolvido pela API (quando houver)
  body?: string; // corpo do erro devolvido pela API (sem a key — só o erro)
};

export async function conversarComJulia(
  system: string,
  messages: ChatMsg[],
): Promise<RespostaJulia> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { reply: "", acao: null, erro: "ANTHROPIC_API_KEY ausente no ambiente." };

  let resp: Response;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        system,
        tools: [TOOL],
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
  } catch (e) {
    return { reply: "", acao: null, erro: `fetch falhou: ${(e as Error).message}` };
  }

  if (!resp.ok) {
    // Corpo cru do erro da Anthropic (contém code/type/message). Nunca contém a
    // key — ela só vai no header x-api-key da request, nunca na resposta.
    const detalhe = await resp.text().catch(() => "");
    return {
      reply: "",
      acao: null,
      erro: `Anthropic ${resp.status}`,
      status: resp.status,
      body: detalhe.slice(0, 800),
    };
  }

  const data = (await resp.json()) as {
    content?: { type: string; text?: string; name?: string; input?: { resumo?: string } }[];
  };
  const blocos = data.content ?? [];
  const reply = blocos
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text as string)
    .join("\n")
    .trim();
  const tool = blocos.find((b) => b.type === "tool_use" && b.name === "registrar_pedido");
  const acao = tool ? { resumo: tool.input?.resumo?.trim() || "Pedido de ação" } : null;

  // Caso raro: modelo só chamou a ferramenta e não escreveu texto ao aluno.
  return { reply: reply || (acao ? FALLBACK_ACAO : ""), acao };
}
