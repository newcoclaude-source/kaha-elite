// Teste do parser de import (lib/kaha/import-parse.ts) com um .xlsx de 10 linhas.
// Roda em Node 24 (type-stripping). Uso: node scripts/testar-import.mjs
import * as XLSX from "xlsx";
import { validarImport, adivinharMapeamento } from "../lib/kaha/import-parse.ts";

// 10 linhas com casos de borda: sem nome (l3), telefone inválido (l5),
// duplicado por telefone (l6 = l1), plano desconhecido (l7 = "Premium").
const dados = [
  { nome: "Eduardo Almeida", telefone: "11 98765 4321", plano: "Elite" },
  { nome: "Marina Costa", telefone: "11987654322", plano: "Convencional" },
  { nome: "", telefone: "11987654323", plano: "Elite" },
  { nome: "Pedro Santos", telefone: "11987654324", plano: "Elite" },
  { nome: "Ana Souza", telefone: "123", plano: "Convencional" },
  { nome: "Eduardo Almeida", telefone: "11 98765 4321", plano: "Elite" },
  { nome: "Carla Dias", telefone: "11987654326", plano: "Premium" },
  { nome: "Bruno Lima", telefone: "11987654327", plano: "Convencional" },
  { nome: "Fernanda Reis", telefone: "11987654328", plano: "Elite" },
  { nome: "Ricardo Gomes", telefone: "11987654329", plano: "Convencional" },
];

const ws = XLSX.utils.json_to_sheet(dados);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Alunos");
XLSX.writeFile(wb, "scripts/exemplo-import-alunos.xlsx");

// round-trip igual ao upload no browser: bytes → XLSX.read → sheet_to_json
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
const wbRead = XLSX.read(buf, { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wbRead.Sheets[wbRead.SheetNames[0]], { defval: "" });

const planos = [
  { id: "p-conv", nome: "Convencional", meta_semanal: 3 },
  { id: "p-elite", nome: "Elite", meta_semanal: 5 },
];
const map = adivinharMapeamento(Object.keys(rows[0]));
console.log("mapeamento:", JSON.stringify(map));
const r = validarImport(rows, map, planos);
console.log("total:", r.total, "| validas:", r.validas.length);
console.log("problemas:", r.problemas.map((p) => `L${p.linha}:${p.motivo}`).join(" | "));
console.log("avisos:", r.avisos.map((p) => `L${p.linha}:${p.motivo}`).join(" | "));
console.log("porPlano:", r.porPlano.map((p) => `${p.plano}=${p.count}`).join(", "));

const ok =
  r.total === 10 &&
  r.validas.length === 8 &&
  r.problemas.length === 2 &&
  r.avisos.length === 1 &&
  r.porPlano.find((p) => p.plano === "Convencional")?.count === 4 &&
  r.porPlano.find((p) => p.plano === "Elite")?.count === 3 &&
  r.porPlano.find((p) => p.plano === "Sem plano")?.count === 1;
console.log(ok ? "\n✅ ASSERÇÕES OK" : "\n❌ FALHOU");
process.exit(ok ? 0 : 1);
