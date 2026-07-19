"use client";

// Card "Primeiros passos" no Dashboard (Fase 2.5). Estados derivados do banco
// (server). Dispensável (x, lembrado no navegador) e some sozinho aos 100%.

import { useEffect, useState } from "react";
import type { PrimeiroPasso } from "@/lib/kaha/onboarding";

const KEY = "kaha_primeiros_passos_dispensado";

export function PrimeirosPassos({
  passos,
  pct,
}: {
  passos: PrimeiroPasso[];
  pct: number;
}) {
  const [dispensado, setDispensado] = useState(true); // oculto até ler o navegador (sem flash)
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setDispensado(localStorage.getItem(KEY) === "1");
    setPronto(true);
  }, []);

  if (!pronto || dispensado || pct >= 100) return null;

  function dispensar() {
    localStorage.setItem(KEY, "1");
    setDispensado(true);
  }

  return (
    <div className="fixed bottom-20 right-3 z-30 w-[min(320px,calc(100vw-1.5rem))] rounded-2xl border border-line bg-card p-4 shadow-lg lg:bottom-4 lg:right-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="flex-1">
          <p className="text-[13px] font-bold text-ink">Primeiros passos</p>
          <p className="text-[11px] text-muted">{pct}% concluído</p>
        </div>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar"
          className="text-muted-2 hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-line-2">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="flex flex-col gap-1.5">
        {passos.map((p) => (
          <li key={p.chave} className="flex items-center gap-2 text-[12.5px]">
            {p.feito ? (
              <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-ok text-[9px] font-bold text-white">
                ✓
              </span>
            ) : (
              <span className="h-4 w-4 flex-none rounded-full border border-line" />
            )}
            <span className={p.feito ? "text-muted line-through" : "text-ink-2"}>
              {p.label}
            </span>
            {p.emBreve && !p.feito && (
              <span className="ml-auto rounded-full bg-line-2 px-1.5 py-0.5 text-[9px] font-semibold text-muted-2">
                em breve
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
