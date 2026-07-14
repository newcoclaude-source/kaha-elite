"use client";

// Shell responsivo: sidebar fixa no desktop (colapsável) + bottom nav no mobile.
// Envolve tudo no ToastProvider. Presentação apenas — não toca em dados/rotas.

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
  const [colapsado, setColapsado] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const pathname = usePathname();

  // Modo imersivo (tela de execução): sem bottom nav, foco total no treino.
  const imersivo = pathname.includes("/executar");

  useEffect(() => {
    setColapsado(localStorage.getItem("kaha_sidebar") === "colapsado");
  }, []);

  function toggleColapso() {
    setColapsado((v) => {
      const novo = !v;
      localStorage.setItem("kaha_sidebar", novo ? "colapsado" : "aberto");
      return novo;
    });
  }

  return (
    <div className="min-h-screen">
      <SidebarDesktop colapsado={colapsado} onToggle={toggleColapso} />

      <div className={colapsado ? "lg:pl-[72px]" : "lg:pl-60"}>
        <main className={`min-h-screen lg:pb-0 ${imersivo ? "" : "pb-24"}`}>
          {children}
        </main>
      </div>

      {!imersivo && <BottomNav onMais={() => setMaisAberto(true)} />}
      {maisAberto && <MaisSheet onClose={() => setMaisAberto(false)} />}
    </div>
  );
}

// ── Desktop ───────────────────────────────────────────────────────────────────

function SidebarDesktop({
  colapsado,
  onToggle,
}: {
  colapsado: boolean;
  onToggle: () => void;
}) {
  const ativo = useAtivo();
  const { toast } = useToast();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface lg:flex ${
        colapsado ? "w-[72px]" : "w-60"
      }`}
    >
      {/* Topo: logo + colapsar */}
      <div className="flex h-16 items-center gap-2 px-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-black italic text-white">
          K
        </span>
        {!colapsado && (
          <span className="title-brand flex-1 text-lg">
            Kaha <span className="text-brand">Elite</span>
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-2 hover:text-text"
          aria-label="Colapsar menu"
        >
          <Icon name="collapse" className="h-4 w-4" />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.key}
            item={item}
            ativo={ativo(item.href)}
            colapsado={colapsado}
            onIndisponivel={() => toast("Em breve", "info")}
          />
        ))}
      </nav>

      {/* Rodapé: Julia + sair */}
      <div className="space-y-2 border-t border-border p-3">
        <div
          className={`flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 ${
            colapsado ? "justify-center" : ""
          }`}
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-ok" />
          {!colapsado && (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text">Julia</p>
              <p className="truncate text-[10px] text-muted-2">concierge</p>
            </div>
          )}
        </div>
        <LogoutButton colapsado={colapsado} />
      </div>
    </aside>
  );
}

function NavLink({
  item,
  ativo,
  colapsado,
  onIndisponivel,
}: {
  item: NavItem;
  ativo: boolean;
  colapsado: boolean;
  onIndisponivel: () => void;
}) {
  const cls = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    ativo
      ? "bg-brand/15 text-brand"
      : "text-muted hover:bg-surface-2 hover:text-text"
  } ${colapsado ? "justify-center" : ""}`;

  const conteudo = (
    <>
      <Icon name={item.icon} className="h-5 w-5 shrink-0" />
      {!colapsado && <span className="flex-1">{item.label}</span>}
      {!colapsado && !item.live && (
        <span className="text-[9px] uppercase text-muted-2">em breve</span>
      )}
    </>
  );

  if (!item.live) {
    return (
      <button
        type="button"
        onClick={onIndisponivel}
        className={`w-full ${cls} opacity-60`}
        title={`${item.label} — em breve`}
      >
        {conteudo}
      </button>
    );
  }
  return (
    <Link href={item.href} className={cls} title={item.label}>
      {conteudo}
    </Link>
  );
}

function LogoutButton({ colapsado }: { colapsado: boolean }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  async function sair() {
    setSaindo(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-60 ${
        colapsado ? "justify-center" : ""
      }`}
      title="Sair"
    >
      <Icon name="logout" className="h-5 w-5 shrink-0" />
      {!colapsado && <span>{saindo ? "Saindo…" : "Sair"}</span>}
    </button>
  );
}

// ── Mobile ────────────────────────────────────────────────────────────────────

function BottomNav({ onMais }: { onMais: () => void }) {
  const ativo = useAtivo();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      {BOTTOM_KEYS.map((k) => {
        const item = itemPorKey(k)!;
        return (
          <Link
            key={k}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
              ativo(item.href) ? "text-brand" : "text-muted-2"
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
  const { toast } = useToast();
  const router = useRouter();

  async function sair() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 lg:hidden"
      onClick={onClose}
    >
      <div
        className="pb-safe w-full rounded-t-2xl border border-border bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="grid grid-cols-1 gap-1">
          {MAIS_KEYS.map((k) => {
            const item = itemPorKey(k)!;
            const conteudo = (
              <>
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {!item.live && (
                  <span className="text-[9px] uppercase text-muted-2">
                    em breve
                  </span>
                )}
              </>
            );
            const cls = `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
              ativo(item.href) ? "bg-brand/15 text-brand" : "text-text"
            }`;
            return item.live ? (
              <Link key={k} href={item.href} onClick={onClose} className={cls}>
                {conteudo}
              </Link>
            ) : (
              <button
                key={k}
                type="button"
                onClick={() => toast("Em breve", "info")}
                className={`${cls} opacity-60`}
              >
                {conteudo}
              </button>
            );
          })}
          <button
            type="button"
            onClick={sair}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted hover:text-text"
          >
            <Icon name="logout" className="h-5 w-5 shrink-0" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
