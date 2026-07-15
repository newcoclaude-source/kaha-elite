import { listarAlunosD1 } from "@/lib/kaha/alunos";
import { horariosLivres, semanaRef } from "@/lib/kaha/sessoes";
import { AlunosD1 } from "./alunos-d1";

export const dynamic = "force-dynamic";

export default async function AlunosPage() {
  const semana = semanaRef();
  const [alunos, slots] = await Promise.all([
    listarAlunosD1(),
    horariosLivres(semana),
  ]);
  return <AlunosD1 alunos={alunos} slots={slots} semana={semana} />;
}
