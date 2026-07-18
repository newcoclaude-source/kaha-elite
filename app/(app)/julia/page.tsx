import { JuliaChat } from "@/components/julia/julia-chat";

// /julia — chat de teste da concierge dentro da plataforma (autenticado pelo
// middleware). Histórico só na sessão do navegador; nada persistido aqui.
export const dynamic = "force-dynamic";

export default function JuliaPage() {
  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col px-4 py-5 lg:px-6">
      <header className="mb-4 flex-none">
        <h1 className="title-brand text-2xl">Julia</h1>
        <p className="text-xs text-muted">
          Converse como se fosse um aluno. A Julia responde — quem executa é a equipe.
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <JuliaChat />
      </div>
    </div>
  );
}
