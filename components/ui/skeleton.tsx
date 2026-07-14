// Skeleton — placeholder de loading por card (nunca spinner de página inteira).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`kaha-skeleton rounded-lg ${className}`} />;
}

// Skeleton pronto no formato de um card de lista.
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-8 w-24" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}
