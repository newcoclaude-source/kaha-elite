// Avatar — iniciais do nome num quadradinho arredondado. Componente-base do D0.
// Neutro por padrão; aceita a cor estável do professor (corProfessor) via cor/soft.
// Módulo puro de apresentação.

import { iniciais } from "@/lib/kaha/ui";

export function Avatar({
  nome,
  cor,
  soft,
  size = 32,
  className = "",
}: {
  nome: string;
  cor?: string; // cor do professor (borda + texto), opcional
  soft?: string; // fundo suave, opcional
  size?: number;
  className?: string;
}) {
  const colorido = cor && soft;
  return (
    <span
      className={`inline-grid flex-none place-items-center rounded-[9px] font-bold ${
        colorido ? "border-[1.5px]" : "bg-line-2 text-ink-2"
      } ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        ...(colorido ? { background: soft, color: cor, borderColor: cor } : {}),
      }}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </span>
  );
}
