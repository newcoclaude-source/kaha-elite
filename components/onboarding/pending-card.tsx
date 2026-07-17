// Card "Configuração X de 4" — pendências do onboarding.
// COMPONENTE STANDALONE, pronto para o Dashboard. A integração no D8 fica
// DEFERIDA (o D8 é commitado — ver DIARIO_ONBOARDING.md C2). Para ligar, basta
// renderizar <OnboardingPendingCard /> no topo do grid do dashboard-d8.tsx.
// Server component: some sozinho quando o onboarding está concluído.

import Link from "next/link";
import { contarPendencias } from "@/lib/kaha/onboarding";

export async function OnboardingPendingCard() {
  const p = await contarPendencias();
  if (p.concluido || p.feito >= p.total) return null;

  return (
    <section className="relative flex flex-col overflow-hidden rounded-card border border-ink bg-ink p-[18px] text-white md:col-span-2 xl:col-span-4">
      <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(225,29,46,.42),transparent_68%)]" />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#FF8A94]">
            Configuração {p.feito} de {p.total}
          </div>
          <h3 className="mt-1 font-display text-[18px] font-black italic">
            Termine de configurar a academia
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.passos.map((s) => (
              <span
                key={s.label}
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                  s.ok
                    ? "bg-white/10 text-[#B4B4BD] line-through"
                    : "bg-[rgba(225,29,46,.16)] text-[#FF8A94]"
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/setup"
          className="rounded-[9px] bg-brand px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-brand-hover"
        >
          Continuar
        </Link>
      </div>
    </section>
  );
}
