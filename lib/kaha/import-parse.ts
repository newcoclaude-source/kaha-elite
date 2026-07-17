// Parse/validação do import de alunos — módulo PURO (sem React, sem DB, sem
// SheetJS). Recebe linhas já lidas da planilha + o mapeamento de colunas e
// devolve o que é válido, os problemas e a contagem por plano. Testável em Node.

export type RawRow = Record<string, string | number | null | undefined>;

export type Mapeamento = {
  nome: string; // chave da coluna do nome
  telefone: string | null;
  plano: string | null;
};

export type PlanoRef = { id: string; nome: string; meta_semanal: number };

export type LinhaValidada = {
  nome: string;
  telefone: string | null;
  plano_id: string | null;
  plano_nome: string;
};

export type Problema = { linha: number; nome: string; motivo: string };

export type ResultadoImport = {
  validas: LinhaValidada[];
  problemas: Problema[];
  avisos: Problema[];
  porPlano: { plano: string; count: number }[];
  total: number;
};

// Normaliza para dígitos com DDI Brasil. Válido = 12 ou 13 dígitos (55 + 10/11).
export function normalizarTelefone(v: unknown): { digits: string | null; valido: boolean } {
  if (v == null) return { digits: null, valido: false };
  let d = String(v).replace(/\D/g, "");
  if (!d) return { digits: null, valido: false };
  if (d.length === 10 || d.length === 11) d = "55" + d;
  const valido = d.length === 12 || d.length === 13;
  return { digits: d, valido };
}

// Palpite automático de mapeamento a partir dos cabeçalhos.
export function adivinharMapeamento(colunas: string[]): Mapeamento {
  const achar = (re: RegExp) => colunas.find((c) => re.test(c.trim())) ?? null;
  return {
    nome: achar(/nome|aluno|name/i) ?? colunas[0] ?? "",
    telefone: achar(/tel|fone|whats|celular|phone/i),
    plano: achar(/plano|plan/i),
  };
}

export function validarImport(
  rows: RawRow[],
  map: Mapeamento,
  planos: PlanoRef[],
): ResultadoImport {
  const planoPorNome = new Map(
    planos.map((p) => [p.nome.trim().toLowerCase(), p]),
  );
  const vistos = new Set<string>();
  const validas: LinhaValidada[] = [];
  const problemas: Problema[] = [];
  const avisos: Problema[] = [];

  rows.forEach((row, i) => {
    const linha = i + 2; // +1 (0-index) +1 (cabeçalho)
    const nome = String(row[map.nome] ?? "").trim();
    if (!nome) {
      problemas.push({ linha, nome: "(sem nome)", motivo: "Linha sem nome" });
      return;
    }

    const tel = map.telefone
      ? normalizarTelefone(row[map.telefone])
      : { digits: null, valido: false };
    const rawTel = map.telefone ? String(row[map.telefone] ?? "").trim() : "";

    // plano por nome (case-insensitive)
    let plano_id: string | null = null;
    let plano_nome = "Sem plano";
    if (map.plano) {
      const raw = String(row[map.plano] ?? "").trim().toLowerCase();
      const pl = planoPorNome.get(raw);
      if (pl) {
        plano_id = pl.id;
        plano_nome = pl.nome;
      }
    }

    // dedupe: por telefone válido, senão por nome
    const chave = tel.valido && tel.digits ? `t:${tel.digits}` : `n:${nome.toLowerCase()}`;
    if (vistos.has(chave)) {
      problemas.push({ linha, nome, motivo: "Duplicado na planilha" });
      return;
    }
    vistos.add(chave);

    if (rawTel && !tel.valido) {
      avisos.push({ linha, nome, motivo: "Telefone inválido — será importado sem telefone" });
    }

    validas.push({
      nome,
      telefone: tel.valido ? tel.digits : null,
      plano_id,
      plano_nome,
    });
  });

  const contagem = new Map<string, number>();
  for (const v of validas) {
    contagem.set(v.plano_nome, (contagem.get(v.plano_nome) ?? 0) + 1);
  }
  const porPlano = [...contagem.entries()]
    .map(([plano, count]) => ({ plano, count }))
    .sort((a, b) => b.count - a.count);

  return { validas, problemas, avisos, porPlano, total: rows.length };
}
