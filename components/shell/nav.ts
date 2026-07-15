import type { IconName } from "@/components/ui/icons";

// 6 seções (redesign). Grupos MENU/GERAL na sidebar.
export type NavItem = {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  grupo: "MENU" | "GERAL";
};

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "/dashboard", grupo: "MENU" },
  { key: "agenda", label: "Agenda", icon: "sessoes", href: "/agenda", grupo: "MENU" },
  { key: "alunos", label: "Alunos", icon: "alunos", href: "/alunos", grupo: "MENU" },
  { key: "conversas", label: "Conversas", icon: "conversas", href: "/conversas", grupo: "MENU" },
  { key: "professores", label: "Professores", icon: "professores", href: "/professores", grupo: "GERAL" },
  { key: "configuracoes", label: "Configurações", icon: "config", href: "/configuracoes", grupo: "GERAL" },
];

// Bottom nav (mobile): 4 fixos + "Mais".
export const BOTTOM_KEYS = ["dashboard", "agenda", "alunos", "conversas"];
export const MAIS_KEYS = ["professores", "configuracoes"];

export function itemPorKey(key: string): NavItem | undefined {
  return NAV.find((n) => n.key === key);
}
