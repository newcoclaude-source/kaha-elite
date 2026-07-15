// Card + CardHeader — "a régua" do redesign. Todo card tem cabeçalho; todo
// cabeçalho tem os dois lados (título à esquerda, ação/dado à direita).

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-card border border-line bg-card p-[18px] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: React.ReactNode;
  action?: React.ReactNode; // "Ver tudo →", "•••", ou um dado ("22 alunos")
}) {
  return (
    <div className="mb-3 flex h-5 items-center justify-between gap-3">
      <span className="text-[13px] font-bold leading-none text-ink">
        {title}
      </span>
      {action != null && (
        <span className="text-[11.5px] leading-none text-muted">{action}</span>
      )}
    </div>
  );
}

// Número grande padrão (34px, Archivo itálico 800) — usar em todo card com métrica.
export function BigNumber({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-display text-[34px] font-extrabold italic leading-none text-ink ${className}`}
    >
      {children}
    </span>
  );
}
