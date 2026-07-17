-- 0014_kaha_meta_semanal.sql
-- CORREÇÃO: meta semanal POR ALUNO (sessões-alvo/semana): 3 ou 5. Default 3.
-- Capacidade da semana do Elite = SOMA das metas dos alunos ativos — NÃO alunos×N.
-- O semáforo de cada aluno é relativo à META DELE (proporção, sem número cravado).

alter table kaha_alunos
  add column if not exists meta_semanal int not null default 3
    check (meta_semanal in (3, 5));

-- Semáforo relativo ao alvo de 4 semanas do próprio aluno (meta*4):
-- >=75% do alvo = verde, >=50% = âmbar, abaixo = risco.
-- Generaliza o antigo 3/2/1 (que assumia alvo implícito de 1/semana).
create or replace view kaha_alunos_semaforo as
select a.id, a.nome, a.telefone, a.ativo, a.entrou_em, a.observacoes,
  a.created_at, a.updated_at, a.objetivo, a.vencimento, a.valor_mensal,
  coalesce(s.sessoes_4sem, 0::bigint) as sessoes_4sem,
  case
    when a.meta_semanal is null or a.meta_semanal = 0 then 'risco'::text
    when coalesce(s.sessoes_4sem, 0)::numeric >= 0.75 * a.meta_semanal * 4 then 'verde'::text
    when coalesce(s.sessoes_4sem, 0)::numeric >= 0.50 * a.meta_semanal * 4 then 'ambar'::text
    else 'risco'::text
  end as semaforo,
  a.meta_semanal
from kaha_alunos a
left join lateral (
  select count(*) as sessoes_4sem
  from kaha_sessoes se
  where se.aluno_id = a.id
    and se.estado = 'realizada'::kaha_sessao_estado
    and se.realizada_em >= (now() - '28 days'::interval)
) s on true;
