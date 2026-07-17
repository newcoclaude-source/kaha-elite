"use client";

// Passo 4 · Importar alunos. Upload .xlsx/.csv (SheetJS) → mapeamento de colunas
// → preview com contagem por plano e validação (duplicados, telefone) → import.
// A lógica de validação vive em lib/kaha/import-parse.ts (pura, testada em Node).
// Alunos importados nascem com seed=false (via importarAlunos).

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import type { Plano } from "@/lib/kaha/onboarding";
import {
  adivinharMapeamento,
  validarImport,
  type Mapeamento,
  type RawRow,
} from "@/lib/kaha/import-parse";
import { importarAlunos } from "./actions";

export function ImportarAlunos({ planos }: { planos: Plano[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<RawRow[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [map, setMap] = useState<Mapeamento | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, start] = useTransition();
  const [feito, setFeito] = useState<number | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(null);
    setFeito(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });
      if (!json.length) {
        setErro("A planilha está vazia.");
        return;
      }
      const cols = Object.keys(json[0]);
      setRows(json);
      setColunas(cols);
      setMap(adivinharMapeamento(cols));
      setNomeArquivo(file.name);
    } catch {
      setErro("Não consegui ler o arquivo. Use .xlsx ou .csv com cabeçalho.");
    }
  }

  const resultado = useMemo(
    () => (map && rows.length ? validarImport(rows, map, planos) : null),
    [rows, map, planos],
  );

  function importar() {
    if (!resultado) return;
    start(async () => {
      const r = await importarAlunos(
        resultado.validas.map((v) => ({
          nome: v.nome,
          telefone: v.telefone,
          plano_id: v.plano_id,
        })),
      );
      if (r.ok) {
        setFeito(r.inseridos);
        router.refresh();
      } else setErro(r.erro ?? "Falha ao importar.");
    });
  }

  if (feito != null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-ok/40 bg-ok-soft px-6 py-10 text-center">
        <div className="font-display text-[34px] font-black italic text-ok">{feito}</div>
        <p className="text-sm font-semibold text-ink">
          {feito === 1 ? "aluno importado" : "alunos importados"} 🎯
        </p>
        <p className="text-[12px] text-muted">Você já pode concluir a configuração.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        Suba sua planilha (.xlsx ou .csv) com os alunos. A primeira linha deve ter os
        cabeçalhos (nome, telefone, plano).
      </p>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface-2 px-4 py-8 text-center hover:border-brand">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          className="hidden"
        />
        <span className="text-sm font-semibold text-ink-2">
          {nomeArquivo ?? "Escolher planilha"}
        </span>
        <span className="text-[11.5px] text-muted-2">.xlsx, .xls ou .csv</span>
      </label>

      {erro && <p className="text-xs text-risk">{erro}</p>}

      {map && colunas.length > 0 && (
        <div className="rounded-xl border border-line bg-card p-3">
          <p className="mb-2 text-[12px] font-semibold text-ink-2">
            De qual coluna vem cada campo?
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <MapSelect
              label="Nome"
              value={map.nome}
              colunas={colunas}
              onChange={(v) => setMap({ ...map, nome: v ?? "" })}
            />
            <MapSelect
              label="Telefone"
              value={map.telefone}
              colunas={colunas}
              opcional
              onChange={(v) => setMap({ ...map, telefone: v })}
            />
            <MapSelect
              label="Plano"
              value={map.plano}
              colunas={colunas}
              opcional
              onChange={(v) => setMap({ ...map, plano: v })}
            />
          </div>
        </div>
      )}

      {resultado && (
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold italic text-ink">
              {resultado.validas.length}
            </span>
            <span className="text-[12px] text-muted">
              de {resultado.total} prontos para importar
            </span>
          </div>

          <div className="mb-3 flex flex-col gap-1.5">
            {resultado.porPlano.map((p) => (
              <div key={p.plano} className="flex items-center gap-2 text-[12px]">
                <span
                  className={`h-2 w-2 flex-none rounded-full ${p.plano === "Sem plano" ? "bg-muted-2" : "bg-brand"}`}
                />
                <span className="flex-1 text-ink-2">{p.plano}</span>
                <span className="font-semibold">{p.count}</span>
              </div>
            ))}
          </div>

          {resultado.avisos.length > 0 && (
            <p className="mb-1 rounded-lg bg-warn-soft px-2.5 py-1.5 text-[11.5px] text-warn">
              {resultado.avisos.length} aviso(s): telefone inválido será importado sem
              telefone.
            </p>
          )}
          {resultado.problemas.length > 0 && (
            <details className="rounded-lg bg-red-soft px-2.5 py-1.5 text-[11.5px] text-risk">
              <summary className="cursor-pointer font-semibold">
                {resultado.problemas.length} linha(s) fora (não serão importadas)
              </summary>
              <ul className="mt-1 space-y-0.5">
                {resultado.problemas.slice(0, 20).map((p, i) => (
                  <li key={i}>
                    Linha {p.linha} · {p.nome}: {p.motivo}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <button
            type="button"
            onClick={importar}
            disabled={importando || resultado.validas.length === 0}
            className="mt-3 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {importando
              ? "Importando…"
              : `Importar ${resultado.validas.length} aluno${resultado.validas.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}

function MapSelect({
  label,
  value,
  colunas,
  opcional,
  onChange,
}: {
  label: string;
  value: string | null;
  colunas: string[];
  opcional?: boolean;
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-lg border border-line px-2 py-2 text-[13px] outline-none focus:border-muted-2"
      >
        {opcional && <option value="">— nenhuma —</option>}
        {colunas.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
