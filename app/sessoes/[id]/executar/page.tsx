import { notFound } from "next/navigation";
import { obterCargasDaSessao } from "@/lib/kaha/cargas";
import { Execucao } from "./execucao";

export const dynamic = "force-dynamic";

export default async function ExecutarPage({
  params,
}: {
  params: { id: string };
}) {
  const execucao = await obterCargasDaSessao(params.id);
  if (!execucao) notFound();
  return <Execucao execucao={execucao} />;
}
