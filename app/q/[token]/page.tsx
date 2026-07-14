import { createClient } from "@/lib/supabase/server";
import { Centro, Questionario } from "./questionario";

export const dynamic = "force-dynamic";

type Info = { valido: boolean; nome?: string; respondido?: boolean };

export default async function QuestionarioPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("kaha_questionario_info", {
    p_token: params.token,
  });
  const info = (error ? null : (data as Info)) ?? { valido: false };

  if (!info.valido) {
    return (
      <Centro>
        <h1 className="title-brand text-3xl">
          Link <span className="text-brand">indisponível</span>
        </h1>
        <p className="mt-2 text-muted">
          Este link não está mais ativo. Fale com a recepção do CT Kaha se
          precisar.
        </p>
      </Centro>
    );
  }

  if (info.respondido) {
    return (
      <Centro>
        <div className="text-5xl">✅</div>
        <h1 className="title-brand mt-4 text-3xl">
          Já <span className="text-brand">recebemos</span>
        </h1>
        <p className="mt-2 text-muted">
          Seu retorno deste treino já chegou{info.nome ? `, ${info.nome}` : ""}.
          Obrigado!
        </p>
      </Centro>
    );
  }

  return <Questionario token={params.token} nome={info.nome ?? ""} />;
}
