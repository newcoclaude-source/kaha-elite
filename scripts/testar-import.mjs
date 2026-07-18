// Teste do parser de import (lib/kaha/import-parse.ts) com um .xlsx de 10 linhas,
// agora com coluna Gênero. Roda em Node 24. Uso: node scripts/testar-import.mjs
import * as XLSX from "xlsx";
import { validarImport, adivinharMapeamento } from "../lib/kaha/import-parse.ts";

// Casos de borda: sem nome (l4), telefone inválido (l6), duplicado (l7=l1),
// plano desconhecido (l8="Premium"), SEM gênero (l9, Bruno) → válido com aviso.
const dados = [
  { Nome: "Eduardo Almeida", Telefone: "11 98765 4321", Plano: "Elite", "Gênero": "M" },
  { Nome: "Marina Costa", Telefone: "11987654322", Plano: "Convencional", "Gênero": "F" },
  { Nome: "", Telefone: "11987654323", Plano: "Elite", "Gênero": "F" },
  { Nome: "Pedro Santos", Telefone: "11987654324", Plano: "Elite", "Gênero": "M" },
  { Nome: "Ana Souza", Telefone: "123", Plano: "Convencional", "Gênero": "F" },
  { Nome: "Eduardo Almeida", Telefone: "11 98765 4321", Plano: "Elite", "Gênero": "M" },
  { Nome: "Carla Dias", Telefone: "11987654326", Plano: "Premium", "Gênero": "F" },
  { Nome: "Bruno Lima", Telefone: "11987654327", Plano: "Convencional", "Gênero": "" },
  { Nome: "Fernanda Reis", Telefone: "11987654328", Plano: "Elite", "Gênero": "F" },
  { Nome: "Ricardo Gomes", Telefone: "11987654329", Plano: "Convencional", "Gênero": "M" },
];

const ws = XLSX.utils.json_to_sheet(dados);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Alunos");
XLSX.writeFile(wb, "scripts/exemplo-import-alunos.xlsx");

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
const gen = (n) => r.validas.find((v) => v.nome === n)?.genero;
console.log("gênero: Marina=", gen("Marina Costa"), "Eduardo=", gen("Eduardo Almeida"), "Bruno=", gen("Bruno Lima"));

const ok =
  r.total === 10 &&
  r.validas.length === 8 &&
  r.problemas.length === 2 &&
  r.avisos.length === 2 &&
  r.porPlano.find((p) => p.plano === "Convencional")?.count === 4 &&
  r.porPlano.find((p) => p.plano === "Elite")?.count === 3 &&
  r.porPlano.find((p) => p.plano === "Sem plano")?.count === 1 &&
  gen("Marina Costa") === "f" &&
  gen("Eduardo Almeida") === "m" &&
  gen("Bruno Lima") === null &&
  map.genero === "Gênero";
console.log(ok ? "\n✅ ASSERÇÕES OK" : "\n❌ FALHOU");
process.exit(ok ? 0 : 1);
