import type { IconName } from "@/components/ui/icons";

// As 8 seções. `live` = rota já existe (as demais chegam nos próximos blocos).
export type NavItem = {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  live: boolean;
};

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "/dashboard", live: true },
  { key: "alunos", label: "Alunos", icon: "alunos", href: "/alunos", live: true },
  { key: "sessoes", label: "Sessões", icon: "sessoes", href: "/sessoes", live: true },
  { key: "treinos", label: "Treinos", icon: "treinos", href: "/treinos", live: false },
  { key: "conversas", label: "Conversas", icon: "conversas", href: "/conversas", live: false },
  { key: "professores", label: "Professores", icon: "professores", href: "/professores", live: true },
  { key: "comercial", label: "Comercial", icon: "comercial", href: "/comercial", live: false },
  { key: "config", label: "Config", icon: "config", href: "/config", live: false },
];

// Itens fixos do bottom nav (mobile). O 4º é "Mais".
export const BOTTOM_KEYS = ["dashboard", "alunos", "sessoes"];
// Itens dentro do sheet "Mais".
export const MAIS_KEYS = ["treinos", "conversas", "professores", "comercial", "config"];

export function itemPorKey(key: string): NavItem | undefined {
  return NAV.find((n) => n.key === key);
}
