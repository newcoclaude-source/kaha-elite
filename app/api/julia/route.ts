import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  conversarComJulia,
  montarSystemPrompt,
  type ChatMsg,
  type ConciergeConfig,
} from "@/lib/julia/concierge";

// Rota server-side da Julia (Fase 3 · Teste). Autenticada (evita endpoint anônimo
// que gastaria a chave). System prompt montado de kaha_config + kaha_faq. A chave
// da Anthropic vive só no ambiente (server) — nunca chega ao client.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  let body: { messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim(),
    )
    .slice(-12); // histórico curto: só o suficiente de contexto
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ erro: "Envie uma mensagem." }, { status: 400 });
  }

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
  const { reply, acao, erro } = await conversarComJulia(system, messages);
  if (erro) {
    console.error("[julia] erro:", erro);
    return NextResponse.json({ erro: "A Julia não conseguiu responder agora." }, { status: 502 });
  }

  // Pedido de ação → registro (a Julia não executa). Não bloqueia a resposta.
  if (acao) {
    const { error } = await supabase.from("kaha_julia_pendencias").insert({
      pedido: messages[messages.length - 1].content,
      resumo: acao.resumo,
      origem: "chat_teste",
    });
    if (error) console.error("[julia] falha ao registrar pendência:", error.message);
  }

  return NextResponse.json({ reply, pendencia: !!acao });
}
