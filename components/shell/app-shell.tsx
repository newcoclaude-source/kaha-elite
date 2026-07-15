"use client";

// Shell do redesign: página clara + sidebar preta flutuante (desktop) e bottom
// nav (mobile). 6 seções. Presentação apenas — não toca em dados/rotas/lógica.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/icons";
import { ToastProvider, useToast } from "@/components/ui/toast";
import {
  BOTTOM_KEYS,
  MAIS_KEYS,
  NAV,
  itemPorKey,
  type NavItem,
} from "./nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Chrome>{children}</Chrome>
    </ToastProvider>
  );
}

function useAtivo() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
}

function Chrome({ children }: { children: React.ReactNode }) {
  const [maisAberto, setMaisAberto] = useState(false);
  const pathname = usePathname();
  const imersivo = pathname.includes("/executar");

  return (
    <div className="min-h-screen bg-bg">
      {!imersivo && <SidebarDesktop />}

      <div className={imersivo ? "" : "lg:pl-[260px]"}>
        <main className={`min-h-screen ${imersivo ? "" : "pb-24 lg:pb-0"}`}>
          {children}
        </main>
      </div>

      {!imersivo && <BottomNav onMais={() => setMaisAberto(true)} />}
      {maisAberto && <MaisSheet onClose={() => setMaisAberto(false)} />}
    </div>
  );
}

// ── Desktop ───────────────────────────────────────────────────────────────────

function SidebarDesktop() {
  const ativo = useAtivo();
  const grupos: ("MENU" | "GERAL")[] = ["MENU", "GERAL"];

  return (
    <aside className="fixed inset-y-3 left-3 z-40 hidden w-[236px] flex-col rounded-shell bg-ink text-white lg:flex">
      {/* Topo: logo */}
      <div className="flex items-center gap-2.5 px-5 pb-2 pt-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red text-lg font-black italic text-white">
          K
        </span>
        <span className="title-brand text-lg text-white">
          Kaha <span className="text-red">Elite</span>
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {grupos.map((g) => (
          <div key={g} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              {g}
            </p>
            {NAV.filter((n) => n.grupo === g).map((item) => (
              <NavLink key={item.key} item={item} ativo={ativo(item.href)} />
            ))}
          </div>
        ))}
      </nav>

      {/* Rodapé: usuário */}
      <UserFooter />
    </aside>
  );
}

function NavLink({ item, ativo }: { item: NavItem; ativo: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        ativo
          ? "bg-red text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon name={item.icon} className="h-5 w-5 shrink-0" />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

function UserFooter() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function sair() {
    setSaindo(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
        {(email?.[0] ?? "K").toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">
          {email ? email.split("@")[0] : "Kaha Elite"}
        </p>
        <p className="truncate text-[10px] text-white/40">CT Kaha</p>
      </div>
      <button
        type="button"
        onClick={sair}
        disabled={saindo}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-50"
        title="Sair"
      >
        <Icon name="logout" className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Mobile ────────────────────────────────────────────────────────────────────

function BottomNav({ onMais }: { onMais: () => void }) {
  const ativo = useAtivo();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card/95 backdrop-blur lg:hidden">
      {BOTTOM_KEYS.map((k) => {
        const item = itemPorKey(k)!;
        return (
          <Link
            key={k}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
              ativo(item.href) ? "text-red" : "text-muted-2"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMais}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-muted-2"
      >
        <Icon name="more" className="h-5 w-5" />
        Mais
      </button>
    </nav>
  );
}

function MaisSheet({ onClose }: { onClose: () => void }) {
  const ativo = useAtivo();
  const router = useRouter();

  async function sair() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
      onClick={onClose}
    >
      <div
        className="pb-safe w-full rounded-t-2xl border border-line bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <div className="grid grid-cols-1 gap-1">
          {MAIS_KEYS.map((k) => {
            const item = itemPorKey(k)!;
            return (
              <Link
                key={k}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                  ativo(item.href) ? "bg-red-soft text-red" : "text-ink"
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={sair}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted hover:text-ink"
          >
            <Icon name="logout" className="h-5 w-5 shrink-0" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
