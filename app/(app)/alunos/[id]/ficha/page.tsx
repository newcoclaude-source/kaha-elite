import Link from "next/link";
import { notFound } from "next/navigation";
import { obterAluno } from "@/lib/kaha/alunos";
import { listarBiblioteca } from "@/lib/kaha/biblioteca";
import { FichaEditor } from "./ficha-editor";

export const dynamic = "force-dynamic";

export default async function FichaPage({
  params,
}: {
  params: { id: string };
}) {
  const [dados, biblioteca] = await Promise.all([
    obterAluno(params.id),
    listarBiblioteca(),
  ]);
  if (!dados) notFound();
  const { aluno, ficha, exercicios } = dados;

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <Link
        href={`/alunos/${aluno.id}`}
        className="text-xs font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
      >
        ← {aluno.nome}
      </Link>
      <h1 className="title-brand mb-1 mt-3 text-3xl">
        {ficha ? "Editar" : "Montar"}{" "}
        <span className="text-brand">treino</span>
      </h1>
      <p className="mb-6 text-sm text-muted">{aluno.nome}</p>

      <FichaEditor
        alunoId={aluno.id}
        objetivoInicial={ficha?.objetivo ?? ""}
        divisaoInicial={ficha?.divisao ?? ""}
        exerciciosIniciais={exercicios.map((e) => ({
          nome: e.nome,
          series: e.series,
          reps_alvo: e.reps_alvo,
          carga_alvo: e.carga_alvo,
          biblioteca_id: e.biblioteca_id,
        }))}
        bibliotecaInicial={biblioteca}
      />
    </main>
  );
}
