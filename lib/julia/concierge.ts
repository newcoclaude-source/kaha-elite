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
  if (!key) {
    // Diagnóstico (só NOMES de variáveis, nunca valores): distingue erro de
    // nome (typo/espaço) de erro de escopo (nenhuma var ANTHROP no ambiente).
    const nomes = Object.keys(process.env).filter((k) => k.toUpperCase().includes("ANTHROP"));
    return {
      reply: "",
      acao: null,
      erro: "ANTHROPIC_API_KEY ausente no ambiente.",
      body: `nomes_com_ANTHROP=[${nomes.join(" | ")}] typeof=${typeof process.env
        .ANTHROPIC_API_KEY} len=${(process.env.ANTHROPIC_API_KEY ?? "").length}`,
    };
  }

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

// ══════════════════════════════════════════════════════════════════════════
// MODO CALIBRAÇÃO — a Julia entrevista o GESTOR e grava a config em tempo real.
// Caminho SEPARADO do aluno (system prompt e tools próprios). A gravação real no
// banco é feita pela rota; aqui só a lógica pura (prompt, tools, coerção, exemplos).
// ══════════════════════════════════════════════════════════════════════════

// Whitelist de campos graváveis — os MESMOS que o formulário 3.5 grava. Nada fora.
const CAMPOS_CALIBRACAO = [
  "tom",
  "saudacao",
  "janela_inicio",
  "janela_fim",
  "resposta_valores",
  "prazo_cancelar",
  "dias_resgate",
  "hora_confirmacao",
  "nunca_fazer",
] as const;

function coerceTom(v: string): string {
  const s = v.toLowerCase();
  if (/(diret|objetiv|energ|foco|sem rodeio|direto|firme)/.test(s)) return "energia";
  if (/(elegan|discret|premium|sofist|s[óo]bri|refinad|formal)/.test(s)) return "premium";
  return "proximo";
}

function coerceHora(v: string): string | null {
  const m = v.match(/(\d{1,2})\s*[:h]\s*(\d{2})?/);
  if (m) {
    const h = +m[1];
    const mm = m[2] ? +m[2] : 0;
    if (h <= 23 && mm <= 59) return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    return null;
  }
  const n = v.match(/\b(\d{1,2})\b/);
  if (n) {
    const h = +n[1];
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
  }
  return null;
}

export type PreparoSalvar =
  | { alvo: "config"; coluna: string; valor: string | number }
  | { alvo: "faq_limite"; resposta: string }
  | { erro: string };

// Valida contra a whitelist e normaliza o valor em linguagem natural. Defesa no
// servidor: qualquer campo fora da lista é recusado.
export function prepararSalvar(campo: string, valorRaw: string): PreparoSalvar {
  const valor = (valorRaw ?? "").trim();
  if (!CAMPOS_CALIBRACAO.includes(campo as (typeof CAMPOS_CALIBRACAO)[number])) {
    return { erro: `campo não permitido: ${campo}` };
  }
  if (!valor) return { erro: "valor vazio" };
  switch (campo) {
    case "tom":
      return { alvo: "config", coluna: "tom", valor: coerceTom(valor) };
    case "saudacao":
      return { alvo: "config", coluna: "saudacao", valor };
    case "resposta_valores":
      return { alvo: "config", coluna: "resposta_valores", valor };
    case "prazo_cancelar":
      return { alvo: "config", coluna: "prazo_cancelar", valor };
    case "nunca_fazer":
      return { alvo: "faq_limite", resposta: valor };
    case "dias_resgate": {
      const n = parseInt(valor.replace(/\D+/g, " ").trim(), 10);
      return Number.isInteger(n) && n > 0 && n <= 90
        ? { alvo: "config", coluna: "dias_resgate", valor: n }
        : { erro: "número de dias inválido" };
    }
    case "janela_inicio":
    case "janela_fim":
    case "hora_confirmacao": {
      const t = coerceHora(valor);
      return t ? { alvo: "config", coluna: campo, valor: t } : { erro: "horário inválido" };
    }
    default:
      return { erro: `campo não permitido: ${campo}` };
  }
}

export const TOOLS_CALIBRACAO = [
  {
    name: "salvar_configuracao",
    description:
      "Grava UMA preferência de atendimento assim que o gestor responder. Chame em tempo real, não espere o fim da conversa.",
    input_schema: {
      type: "object",
      properties: {
        campo: {
          type: "string",
          enum: CAMPOS_CALIBRACAO,
          description: "qual preferência está sendo salva",
        },
        valor: {
          type: "string",
          description: "o valor em linguagem natural (o servidor normaliza)",
        },
      },
      required: ["campo", "valor"],
    },
  },
  {
    name: "adicionar_faq",
    description:
      "Adiciona uma pergunta frequente dos alunos com a resposta que a Julia deve dar (ex.: abrem sábado?, reposição, estacionamento).",
    input_schema: {
      type: "object",
      properties: {
        pergunta: { type: "string" },
        resposta: { type: "string" },
      },
      required: ["pergunta", "resposta"],
    },
  },
  {
    name: "mostrar_resultado",
    description:
      "Quando o essencial estiver coberto, chame para receber 2 mensagens de exemplo (resgate + confirmação) já renderizadas, para mostrar ao gestor e confirmar se ficou com a cara dele.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

export function montarSystemPromptCalibracao(cfg: Partial<ConciergeConfig>): string {
  const nome = cfg.academia_nome?.trim() || "CT Kaha";
  const jaTem: string[] = [];
  if (cfg.tom) jaTem.push("tom");
  if (cfg.saudacao) jaTem.push("jeito de falar");
  if (cfg.resposta_valores) jaTem.push("resposta sobre preço");
  if (cfg.prazo_cancelar) jaTem.push("prazo de cancelamento");

  return [
    `Você é a Julia, a concierge do Elite do ${nome}. Agora você conversa com o DONO/gestor da academia para aprender a atender os alunos dele — não é um aluno.`,
    "Seu jeito: acolhedora, animada e prática. Faça UMA pergunta por vez, curta, como no WhatsApp. Sem listas longas.",
    "Salve cada resposta com as ferramentas assim que entender — em tempo real, não espere o fim. Depois de salvar, confirme com uma palavra ('anotado!') e siga para a próxima.",
    "",
    "Roteiro-guia (flexível; pule o que já estiver claro):",
    "1. Como você gosta que eu fale com seus alunos? → salvar_configuracao('tom', ...).",
    "2. Tem alguma expressão sua? (ex.: 'Bora!', 'Tamo junto') → salvar_configuracao('saudacao', ...).",
    "3. Tem algo que eu NUNCA devo prometer ou falar? → salvar_configuracao('nunca_fazer', ...) (um por vez).",
    "4. Se um aluno perguntar preço, eu respondo ou direciono para a equipe? → salvar_configuracao('resposta_valores', ...).",
    "5. Para desmarcar sem perder a sessão, com quanta antecedência? → salvar_configuracao('prazo_cancelar', ...).",
    "6. Depois de quantos dias sem treinar eu vou atrás do aluno? → salvar_configuracao('dias_resgate', ...).",
    "7. Me conta 2-3 perguntas que os alunos mais fazem e como responder (abrem sábado? reposição? estacionamento?) → adicionar_faq para cada.",
    "",
    "Quando cobrir o essencial (jeito, limites, preço, prazo, resgate e 2-3 perguntas), chame mostrar_resultado, mostre os 2 exemplos ao gestor com as próprias palavras e pergunte: 'ficou a sua cara? quer ajustar algo?'. Se ele quiser mudar algo, regrave e mostre de novo.",
    jaTem.length
      ? `Já configurado: ${jaTem.join(", ")} — não repita essas, mas pode ajustar se ele pedir.`
      : "",
    "",
    "REGRAS: nunca se descreva como assistente virtual, robô, sistema ou programa. Nunca use: IA, inteligência artificial, bot, chatbot, robô, automático, automação, disparo, CRM, software. Português do Brasil, curto e humano.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// Exemplo fixo para renderizar os templates reais no FECHO (sem dados de aluno real).
const EXEMPLO_VARS: Record<string, string> = {
  nome: "Marina",
  dia: "quinta",
  hora: "18:00",
  professor: "o Rafael",
  chamada: "sumida!",
  treino_do_dia: "treino de costas",
  horarios_livres: "quinta 18h ou sexta 19h",
};

// Mesma substituição de {chave} do renderTemplate (lib/julia/templates.ts) —
// inline aqui para o módulo ficar autocontido (importável direto em Node).
function preencher(conteudo: string, vars: Record<string, string>): string {
  return conteudo.replace(/\{(\w+)\}/g, (_m, k) => (vars[k] == null ? `{${k}}` : String(vars[k])));
}

export function renderExemplos(templates: { tipo: string; conteudo: string }[]): string {
  const by = new Map(templates.map((t) => [t.tipo, t.conteudo]));
  const resgate = by.get("resgate")
    ? preencher(by.get("resgate")!, EXEMPLO_VARS)
    : "(sem template de resgate)";
  const conf = by.get("confirmacao")
    ? preencher(by.get("confirmacao")!, EXEMPLO_VARS)
    : "(sem template de confirmação)";
  return `📩 Exemplo de RESGATE (aluno sumido):\n"${resgate}"\n\n📩 Exemplo de CONFIRMAÇÃO do dia:\n"${conf}"`;
}

// Chamada crua à Anthropic devolvendo os blocos + stop_reason (para o loop de
// tools da calibração, que roda na rota com acesso ao banco).
export async function chamarAnthropicRaw(
  system: string,
  messages: unknown[],
  tools: unknown[],
): Promise<{ blocks: AnthropicBlock[]; stopReason: string; erro?: string; status?: number; body?: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { blocks: [], stopReason: "", erro: "ANTHROPIC_API_KEY ausente no ambiente." };
  let resp: Response;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, system, tools, messages }),
    });
  } catch (e) {
    return { blocks: [], stopReason: "", erro: `fetch falhou: ${(e as Error).message}` };
  }
  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => "");
    return { blocks: [], stopReason: "", erro: `Anthropic ${resp.status}`, status: resp.status, body: detalhe.slice(0, 800) };
  }
  const data = (await resp.json()) as { content?: AnthropicBlock[]; stop_reason?: string };
  return { blocks: data.content ?? [], stopReason: data.stop_reason ?? "" };
}

export type AnthropicBlock = {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, string>;
};
