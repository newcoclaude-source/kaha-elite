import {
  horariosLivres,
  listarAlunosSemSessao,
  listarSessoesDaSemana,
  semanaComOffset,
  semanaRef,
} from "@/lib/kaha/sessoes";
import { DIAS_UI } from "@/lib/kaha/grade";
import { AgendaD3 } from "./agenda-d3";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";

function ehSemana(v: string | undefined): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? semanaRef(new Date(v + "T12:00:00Z"))
    : semanaRef();
}

function rotuloSemana(semana: string): string {
  const ini = new Date(semana + "T12:00:00Z");
  const fim = new Date(ini);
  fim.setUTCDate(fim.getUTCDate() + 6);
  const dia = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "UTC" });
  const mes = (d: Date) =>
    d.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
  const mesIni = mes(ini);
  const mesFim = mes(fim);
  return mesIni === mesFim
    ? `${dia(ini)} – ${dia(fim)} de ${mesFim}`
    : `${dia(ini)} de ${mesIni} – ${dia(fim)} de ${mesFim}`;
}

// Data ISO (YYYY-MM-DD) de "hoje" no fuso de São Paulo.
function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Data (YYYY-MM-DD) do dia da semana dentro da semana_ref (segunda).
function dataDoDia(semana: string, dia: number): string {
  const monday = new Date(semana + "T00:00:00Z");
  const offset = dia === 0 ? 6 : dia - 1;
  monday.setUTCDate(monday.getUTCDate() + offset);
  return monday.toISOString().slice(0, 10);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { semana?: string };
}) {
  const semana = ehSemana(searchParams.semana);
  const [sessoes, fila, livres] = await Promise.all([
    listarSessoesDaSemana(semana),
    listarAlunosSemSessao(semana),
    horariosLivres(semana),
  ]);

  const semanaAtual = semanaRef();
  const hoje = hojeSP();
  const naSemanaAtual = semana === semanaAtual;

  // Colunas Seg…Dom com o dia do mês e marcação de "hoje".
  const colunas = DIAS_UI.map((d) => {
    const iso = dataDoDia(semana, d.dia);
    return {
      dia: d.dia,
      label: d.label,
      diaMes: Number(iso.slice(8, 10)),
      hoje: iso === hoje,
    };
  });

  // Dia da semana de hoje (0=Dom…6=Sáb), para a vista de dia no mobile.
  const hojeDia = new Date(hoje + "T12:00:00Z").getUTCDay();

  return (
    <AgendaD3
      semana={semana}
      semanaLabel={rotuloSemana(semana)}
      naSemanaAtual={naSemanaAtual}
      anterior={semanaComOffset(semana, -1)}
      proxima={semanaComOffset(semana, 1)}
      colunas={colunas}
      hojeISO={hoje}
      hojeDia={naSemanaAtual ? hojeDia : null}
      sessoes={sessoes}
      livres={livres}
      fila={fila}
    />
  );
}
