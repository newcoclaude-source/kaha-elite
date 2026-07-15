// Cor do professor derivada de forma ESTÁVEL do id. A mesma cor aparece em
// Professores, Agenda e Alunos. Paleta fixa do PLANO_DESIGN.
// Módulo puro: Client e Server.

const PALETA = ["#E11D2E", "#2563EB", "#15A34A", "#7C3AED"] as const;
const SOFT: Record<string, string> = {
  "#E11D2E": "#FEF2F3",
  "#2563EB": "#EFF6FF",
  "#15A34A": "#F0FDF4",
  "#7C3AED": "#F5F3FF",
};

export function corProfessor(id: string | null | undefined): {
  cor: string;
  soft: string;
} {
  if (!id) return { cor: "#71717A", soft: "#F1F1F3" };
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const cor = PALETA[h % PALETA.length];
  return { cor, soft: SOFT[cor] };
}
