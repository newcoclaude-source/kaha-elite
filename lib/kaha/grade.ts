// Constantes compartilhadas da grade de horários (editor + agenda semanal).
// Módulo puro: pode ser importado por Server e Client Components.

// Colunas da UI: Seg..Dom. `dia` = valor no banco (0=domingo, padrão Postgres/JS).
export const DIAS_UI = [
  { label: "Seg", dia: 1 },
  { label: "Ter", dia: 2 },
  { label: "Qua", dia: 3 },
  { label: "Qui", dia: 4 },
  { label: "Sex", dia: 5 },
  { label: "Sáb", dia: 6 },
  { label: "Dom", dia: 0 },
] as const;

// Linhas: de 06:00 a 22:00, de 30 em 30 min ("HH:MM").
export const SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let min = 6 * 60; min <= 22 * 60; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
})();

// Chave estável de uma célula (dia do banco + hora "HH:MM").
export function celulaKey(dia: number, hora: string): string {
  return `${dia}-${hora.slice(0, 5)}`;
}
