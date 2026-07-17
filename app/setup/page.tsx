import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarSetup } from "@/lib/kaha/onboarding";
import { Wizard } from "./wizard";

export const dynamic = "force-dynamic";

// /setup fica FORA do route group (app) — tela cheia, sem a sidebar/shell.
// Guarda de auth aqui (o middleware commitado não cobre /setup — ver DIARIO C1).
export default async function SetupPage({
  searchParams,
}: {
  searchParams: { preview?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const setup = await carregarSetup();
  const preview = searchParams.preview === "1";
  // Concluído → o wizard não abre por cima do app (a menos que ?preview=1).
  if (setup.config.onboarding_concluido && !preview) redirect("/agenda");

  return <Wizard inicial={setup} preview={preview} />;
}
