import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="title-brand text-4xl">
          Confi<span className="text-red">gurações</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          A voz da Julia, padrões de mensagem, movimentos e regras da casa.
        </p>
      </header>
      <EmptyState
        icon="config"
        title="Chega no próximo bloco"
        description="A tela de configurações e suas tabelas são o D5."
      />
    </div>
  );
}
