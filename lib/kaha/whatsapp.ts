// Normaliza WhatsApp para dígitos com DDI (ex.: "5511971221994").
// No B6 esse valor entra cru no link wa.me, então guardamos já limpo.
export function normalizarWhatsapp(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  // Sem DDI e no tamanho de número BR (10-11 dígitos) → prefixa 55.
  if (d.length <= 11 && !d.startsWith("55")) d = "55" + d;
  return d;
}
