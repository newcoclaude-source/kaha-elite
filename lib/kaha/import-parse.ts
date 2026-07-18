// Parse/validação do import de alunos — módulo PURO (sem React, sem DB, sem
// SheetJS). Recebe linhas já lidas da planilha + o mapeamento de colunas e
// devolve o que é válido, os problemas e a contagem por plano. Testável em Node.

export type RawRow = Record<string, string | number | null | undefined>;

export type Mapeamento = {
  nome: string; // chave da coluna do nome
  telefone: string | null;
  plano: string | null;
  genero: string | null;
};

export type PlanoRef = { id: string; nome: string; meta_semanal: number };

export type LinhaValidada = {
  nome: string;
  telefone: string | null;
  plano_id: string | null;
  plano_nome: string;
  genero: "m" | "f" | null;
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

// F/M, feminino/masculino, f/m → 'f'/'m'; vazio ou desconhecido → null.
export function normalizarGenero(v: unknown): "m" | "f" | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("f")) return "f";
  if (s.startsWith("m")) return "m";
  return null;
}

// Palpite automático de mapeamento a partir dos cabeçalhos.
export function adivinharMapeamento(colunas: string[]): Mapeamento {
  const achar = (re: RegExp) => colunas.find((c) => re.test(c.trim())) ?? null;
  return {
    nome: achar(/nome|aluno|name/i) ?? colunas[0] ?? "",
    telefone: achar(/tel|fone|whats|celular|phone/i),
    plano: achar(/plano|plan/i),
    genero: achar(/g[eê]nero|sexo|gender/i),
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

    // Gênero: sem gênero = VÁLIDO com aviso (mensagens usam frase neutra).
    let genero: "m" | "f" | null = null;
    if (map.genero) {
      const rawGen = String(row[map.genero] ?? "").trim();
      genero = normalizarGenero(rawGen);
      if (!rawGen) avisos.push({ linha, nome, motivo: "Sem gênero — mensagens no neutro" });
      else if (!genero) avisos.push({ linha, nome, motivo: "Gênero não reconhecido — neutro" });
    }

    validas.push({
      nome,
      telefone: tel.valido ? tel.digits : null,
      plano_id,
      plano_nome,
      genero,
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
