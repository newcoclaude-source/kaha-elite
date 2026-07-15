import { listarProfessoresD2 } from "@/lib/kaha/professores";
import { ProfessoresD2 } from "./professores-d2";

export const dynamic = "force-dynamic";

export default async function ProfessoresPage() {
  const profs = await listarProfessoresD2();
  return <ProfessoresD2 profs={profs} />;
}
