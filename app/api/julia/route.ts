import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CALIBRACAO_ATIVA } from "@/lib/julia/flags";
import {
  chamarAnthropicRaw,
  conversarComJulia,
  montarSystemPrompt,
  montarSystemPromptCalibracao,
  prepararSalvar,
  renderExemplos,
  TOOLS_CALIBRACAO,
  type AnthropicBlock,
  type ChatMsg,
  type ConciergeConfig,
} from "@/lib/julia/concierge";

// Rota server-side da Julia. Dois modos separados: "aluno" (padrão, INTOCADO) e
// "calibracao" (a Julia entrevista o gestor e grava a config). Autenticada — a
// chave da Anthropic vive só no server.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Insere uma linha de FAQ só se ainda não existir a mesma pergunta — o modelo às
// vezes re-salva o mesmo item na conversa; isto evita linhas duplicadas.
async function inserirFaqUnico(
  supabase: ReturnType<typeof createClient>,
  pergunta: string,
  resposta: string,
  salvos: string[],
): Promise<string> {
  const { data: ja } = await supabase.from("kaha_faq").select("id").eq("pergunta", pergunta).limit(1);
  if (ja && ja.length) return "já tinha";
  const { error } = await supabase.from("kaha_faq").insert({ pergunta, resposta });
  if (error) return `erro: ${error.message}`;
  salvos.push(pergunta);
  return "salvo";
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  let body: { messages?: ChatMsg[]; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const calibracao = body.mode === "calibracao" && CALIBRACAO_ATIVA;

  const messages = (body.messages ?? [])
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim(),
    )
    .slice(calibracao ? -24 : -12); // aluno mantém -12 (INTOCADO); calibração precisa de mais contexto
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ erro: "Envie uma mensagem." }, { status: 400 });
  }

  // ── MODO CALIBRAÇÃO ────────────────────────────────────────────────────────
  if (calibracao) {
    const { data: cfg } = await supabase
      .from("kaha_config")
      .select("academia_nome, tom, saudacao, resposta_valores, prazo_cancelar")
      .maybeSingle();
    const system = montarSystemPromptCalibracao((cfg ?? {}) as Partial<ConciergeConfig>);

    const loop: unknown[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const salvos: string[] = [];

    for (let iter = 0; iter < 6; iter++) {
      const { blocks, erro, status, body: apiBody } = await chamarAnthropicRaw(
        system,
        loop,
        TOOLS_CALIBRACAO,
      );
      if (erro) {
        console.error(`[julia:calib] falha | erro=${erro} | status=${status ?? "-"} | body=${apiBody ?? "-"}`);
        return NextResponse.json({ erro: "A Julia não conseguiu responder agora." }, { status: 502 });
      }

      const texto = blocks
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text as string)
        .join("\n")
        .trim();
      const toolUses = blocks.filter((b) => b.type === "tool_use");

      if (toolUses.length === 0) {
        console.log(`[julia:calib] ok | salvos=${salvos.length}`);
        return NextResponse.json({ reply: texto, salvos });
      }

      const toolResults = [];
      for (const tu of toolUses) {
        let out = "ok";
        try {
          if (tu.name === "salvar_configuracao") {
            const prep = prepararSalvar(tu.input?.campo ?? "", tu.input?.valor ?? "");
            if ("erro" in prep) {
              out = `não salvei: ${prep.erro}`;
            } else if (prep.alvo === "config") {
              const { error } = await supabase
                .from("kaha_config")
                .update({ [prep.coluna]: prep.valor })
                .eq("id", true);
              out = error ? `erro: ${error.message}` : "salvo";
              if (!error) salvos.push(`${prep.coluna}=${prep.valor}`);
            } else {
              out = await inserirFaqUnico(supabase, `limite: ${prep.resposta}`, prep.resposta, salvos);
            }
          } else if (tu.name === "adicionar_faq") {
            const p = (tu.input?.pergunta ?? "").trim();
            const r = (tu.input?.resposta ?? "").trim();
            out = p && r ? await inserirFaqUnico(supabase, p, r, salvos) : "pergunta ou resposta vazia";
          } else if (tu.name === "mostrar_resultado") {
            const { data: tpls } = await supabase
              .from("kaha_templates")
              .select("tipo, conteudo")
              .in("tipo", ["resgate", "confirmacao"]);
            out = renderExemplos(tpls ?? []);
          } else {
            out = "ferramenta desconhecida";
          }
        } catch {
          out = "erro ao processar";
        }
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: out });
      }

      loop.push({ role: "assistant", content: blocks as AnthropicBlock[] });
      loop.push({ role: "user", content: toolResults });
    }

    console.log(`[julia:calib] max_iter | salvos=${salvos.length}`);
    return NextResponse.json({ reply: "Perfeito, seguimos! Me conta mais um pouco. 😊", salvos });
  }

  // ── MODO ALUNO (padrão — inalterado) ────────────────────────────────────────
  const [{ data: cfg }, { data: faq }] = await Promise.all([
    supabase
      .from("kaha_config")
      .select(
        "academia_nome, academia_horarios, tom, saudacao, janela_inicio, janela_fim, resposta_valores, prazo_cancelar, funcionamento",
      )
      .maybeSingle(),
    supabase.from("kaha_faq").select("pergunta, resposta").order("ordem", { ascending: true }),
  ]);

  const system = montarSystemPrompt((cfg ?? {}) as ConciergeConfig, faq ?? []);
  const { reply, acao, erro, status: apiStatus, body: apiBody } = await conversarComJulia(
    system,
    messages,
  );
  if (erro) {
    console.error(
      `[julia] falha ao responder | erro=${erro} | anthropic_status=${apiStatus ?? "-"} | anthropic_body=${apiBody ?? "-"}`,
    );
    return NextResponse.json({ erro: "A Julia não conseguiu responder agora." }, { status: 502 });
  }

  if (acao) {
    const { error } = await supabase.from("kaha_julia_pendencias").insert({
      pedido: messages[messages.length - 1].content,
      resumo: acao.resumo,
      origem: "chat_teste",
    });
    if (error) console.error("[julia] falha ao registrar pendência:", error.message);
  }

  console.log(`[julia] ok | pendencia=${!!acao} | chars=${reply.length}`);
  return NextResponse.json({ reply, pendencia: !!acao });
}
