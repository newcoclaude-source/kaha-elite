// Helpers de apresentação — módulo puro, seguro para Client e Server Components.

export type Semaforo = "verde" | "ambar" | "risco";

// Objetivos possíveis de uma ficha (usado no select do editor).
export const OBJETIVOS_FICHA = [
  "Hipertrofia",
  "Emagrecimento",
  "Performance",
  "Funcional",
  "Reabilitação",
] as const;

// Grupos musculares da biblioteca (ordem dos chips de filtro).
export const GRUPOS = [
  "Peito",
  "Costas",
  "Pernas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Glúteos",
] as const;

// Equipamentos (usado no mini-form de exercício custom).
export const EQUIPAMENTOS = [
  "Barra",
  "Halteres",
  "Máquina",
  "Polia",
  "Cabo",
  "Peso corporal",
] as const;

// Rótulo + classes por status do semáforo (tokens do tailwind.config).
export const STATUS: Record<
  Semaforo,
  { label: string; dot: string; text: string; chip: string; avatar: string }
> = {
  verde: {
    label: "Em ritmo",
    dot: "bg-ok",
    text: "text-ok",
    chip: "border-ok/40 bg-ok/15 text-ok",
    avatar: "border-ok/40 bg-ok/15 text-ok",
  },
  ambar: {
    label: "Oscilando",
    dot: "bg-warn",
    text: "text-warn",
    chip: "border-warn/40 bg-warn/15 text-warn",
    avatar: "border-warn/40 bg-warn/15 text-warn",
  },
  risco: {
    label: "Em risco",
    dot: "bg-risk",
    text: "text-risk",
    chip: "border-risk/40 bg-risk/15 text-risk",
    avatar: "border-risk/40 bg-risk/15 text-risk",
  },
};

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

export function formatBRL(valor: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(valor ?? 0));
}

// Dias até o vencimento (negativo = vencido). null se não houver data.
export function diasPara(dataISO: string | null | undefined): number | null {
  if (!dataISO) return null;
  const hoje = new Date();
  const alvo = new Date(dataISO + "T00:00:00");
  const ms = alvo.getTime() - Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  return Math.round(ms / 86_400_000);
}
