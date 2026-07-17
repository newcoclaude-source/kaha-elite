-- 0016_kaha_planos.sql — Onboarding: planos + vínculo do aluno + estado do wizard.
--
-- kaha_planos (nome + meta_semanal). Cada aluno passa a apontar para um plano.
-- Migração dos EXISTENTES: cria "Convencional" (meta 3) e "Elite" (meta 5) e
-- vincula cada aluno ao plano da meta que ele JÁ TEM — sem alterar meta de
-- ninguém (o seed é mix 3/5 de propósito; a capacidade 30 continua 30).
-- meta_semanal segue como espelho denormalizado do plano (o Dashboard, D8, lê
-- meta_semanal; NÃO tocamos o D8). O check (3,5) é relaxado p/ meta > 0 porque
-- o gestor cria planos com metas arbitrárias no wizard.

create table if not exists kaha_planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  meta_semanal int not null check (meta_semanal > 0),
  ativo boolean not null default true,
  seed boolean not null default false,
  created_at timestamptz default now()
);
alter table kaha_planos enable row level security;
drop policy if exists kaha_planos_authenticated_all on kaha_planos;
create policy kaha_planos_authenticated_all on kaha_planos
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- vínculo aluno → plano (on delete set null: apagar plano não trava)
alter table kaha_alunos add column if not exists plano_id uuid references kaha_planos(id) on delete set null;

-- relaxa o check antigo de meta_semanal (era in (3,5)); planos podem ter meta > 0
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'kaha_alunos'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%meta_semanal%';
  if c is not null then execute format('alter table kaha_alunos drop constraint %I', c); end if;
end $$;
alter table kaha_alunos
  add constraint kaha_alunos_meta_semanal_pos check (meta_semanal is null or meta_semanal > 0);

-- estado do onboarding no singleton de config
alter table kaha_config add column if not exists onboarding_concluido boolean not null default false;

-- planos dos dados atuais (demo). Idempotente.
insert into kaha_planos (nome, meta_semanal, seed)
select v.nome, v.meta, v.seed
from (values ('Convencional', 3, true), ('Elite', 5, true)) v(nome, meta, seed)
where not exists (select 1 from kaha_planos where seed);

-- vincula cada aluno ao plano com a meta que ele JÁ TEM (não altera metas)
update kaha_alunos a
   set plano_id = p.id
  from kaha_planos p
 where a.plano_id is null and p.seed and p.meta_semanal = a.meta_semanal;

-- ambiente atual já tem dados → o wizard abre CONCLUÍDO
update kaha_config set onboarding_concluido = true where id;
