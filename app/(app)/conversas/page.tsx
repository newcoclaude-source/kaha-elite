import { headers } from "next/headers";
import { montarFilaDoDia } from "@/lib/julia/fila";
import { ConversasClient } from "./conversas-client";

export const dynamic = "force-dynamic";

export default async function ConversasPage() {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const itens = await montarFilaDoDia(origin);
  return <ConversasClient itens={itens} />;
}
