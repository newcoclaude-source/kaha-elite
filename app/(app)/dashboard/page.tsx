import { headers } from "next/headers";
import { carregarDashboard } from "@/lib/kaha/dashboard";
import { DashboardD8 } from "./dashboard-d8";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";

function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function DashboardPage() {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const data = await carregarDashboard(`${proto}://${host}`);

  const hoje = hojeSP();
  const d = new Date(hoje + "T12:00:00Z");
  const hojeDia = d.getUTCDay();
  const offset = hojeDia === 0 ? 6 : hojeDia - 1;
  const diasParaFechar = 6 - offset;
  const hojeLabel = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  });

  return (
    <DashboardD8
      data={data}
      hojeDia={hojeDia}
      hojeLabel={hojeLabel}
      diasParaFechar={diasParaFechar}
    />
  );
}
