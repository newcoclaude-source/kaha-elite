import { redirect } from "next/navigation";

// A tela de professores virou master-detail (D2). O detalhe vive em /professores.
export default function ProfessorRedirect() {
  redirect("/professores");
}
