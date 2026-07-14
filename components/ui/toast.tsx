"use client";

// Toast — feedback de ação (salvo ✓, erro). Provider no shell + hook useToast.

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Icon } from "./icons";

type ToastTipo = "sucesso" | "erro" | "info";
type ToastItem = { id: number; msg: string; tipo: ToastTipo };

type ToastCtx = { toast: (msg: string, tipo?: ToastTipo) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) return { toast: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback((msg: string, tipo: ToastTipo = "sucesso") => {
    const id = ++seq.current;
    setItens((prev) => [...prev, { id, msg, tipo }]);
    setTimeout(() => {
      setItens((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end">
        {itens.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
              t.tipo === "erro"
                ? "border-risk/40 bg-surface text-risk"
                : t.tipo === "info"
                  ? "border-border bg-surface text-text"
                  : "border-ok/40 bg-surface text-ok"
            }`}
          >
            {t.tipo === "sucesso" && <Icon name="check" className="h-4 w-4" />}
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
