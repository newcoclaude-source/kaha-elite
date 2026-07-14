-- Kaha Elite — B3: campos de plano do aluno + objetivo/divisão da ficha +
-- carga alvo do exercício. Recria a view do semáforo para expor os novos campos.
-- RLS já é authenticated-only (0001); colunas novas herdam a policy da tabela.

-- ── Aluno: dados do plano ────────────────────────────────────────────────────
alter table kaha_alunos add column if not exists objetivo text;
alter table kaha_alunos add column if not exists vencimento date;
alter table kaha_alunos
  add column if not exists valor_mensal numeric(10, 2) not null default 1000;

-- ── Ficha: objetivo (categoria) + divisão (texto livre) ──────────────────────
alter table kaha_fichas add column if not exists objetivo text;
alter table kaha_fichas add column if not exists divisao text;

-- ── Exercício: carga alvo (texto: "20kg", "peso do corpo", etc.) ─────────────
alter table kaha_ficha_exercicios add column if not exists carga_alvo text;

-- ── Recria a view do semáforo (mesma lógica; a.* passa a incluir os campos
-- novos do aluno). security_invoker=true → respeita a RLS de quem consulta.
-- drop+create porque create-or-replace não permite reordenar colunas. ────────
drop view if exists kaha_alunos_semaforo;
create view kaha_alunos_semaforo
with (security_invoker = true)
as
select
  a.*,
  coalesce(s.sessoes_4sem, 0) as sessoes_4sem,
  case
    when coalesce(s.sessoes_4sem, 0) >= 3 then 'verde'
    when coalesce(s.sessoes_4sem, 0) = 2 then 'ambar'
    else 'risco'
  end as semaforo
from kaha_alunos a
left join lateral (
  select count(*) as sessoes_4sem
  from kaha_sessoes se
  where se.aluno_id = a.id
    and se.estado = 'realizada'
    and se.realizada_em >= now() - interval '28 days'
) s on true;
