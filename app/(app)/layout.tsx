import { AppShell } from "@/components/shell/app-shell";

// Layout do app autenticado: envolve as seções no shell responsivo.
// URLs não mudam (route group). /login e / ficam fora, sem shell.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
