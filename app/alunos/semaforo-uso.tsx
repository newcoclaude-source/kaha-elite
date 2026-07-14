// Semáforo de uso: 4 quadradinhos (últimas 4 semanas), derivado de sessoes_4sem.
// Presentacional (sem hooks) → serve em Server e Client Components.
export function SemaforoUso({
  sessoes,
  className,
}: {
  sessoes: number;
  className?: string;
}) {
  const verdes = Math.max(0, Math.min(4, sessoes));
  return (
    <span
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
      title={`${sessoes} ${sessoes === 1 ? "sessão" : "sessões"} nas últimas 4 semanas`}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-[3px] ${
            i < verdes ? "bg-ok" : "bg-risk/40"
          }`}
        />
      ))}
    </span>
  );
}
