import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default function ConversasPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="title-brand text-4xl">
          Con<span className="text-red">versas</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          A fila do dia da Julia — a plataforma gera, você envia.
        </p>
      </header>
      <EmptyState
        icon="conversas"
        title="Chega no próximo bloco"
        description="O centro de relacionamento com a fila do dia é o D6."
      />
    </div>
  );
}
