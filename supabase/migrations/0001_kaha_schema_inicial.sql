-- Kaha Elite — schema inicial (fase Copiloto)
-- Todas as tabelas com prefixo kaha_ para conviver com o CRM existente no NewCO.
-- RLS habilitada em tudo. Policies mínimas: acesso apenas para authenticated
-- (piloto). NUNCA usar USING(true).

-- ────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ────────────────────────────────────────────────────────────────────────────

-- Trigger de updated_at (evita depender da extensão moddatetime).
create or replace function kaha_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Estados da sessão: pendente → agendada → confirmada → realizada (ou faltou).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'kaha_sessao_estado') then
    create type kaha_sessao_estado as enum (
      'pendente',
      'agendada',
      'confirmada',
      'realizada',
      'faltou'
    );
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Professores
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists kaha_professores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefone    text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Alunos (22 no plano Elite; telefone em E.164 para o link wa.me)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists kaha_alunos (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  telefone     text,               -- ex.: 5511999998888 (sem +, sem espaços)
  ativo        boolean not null default true,
  entrou_em    date not null default current_date,
  observacoes  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Fichas de treino + exercícios (alimentam as mensagens da concierge)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists kaha_fichas (
  id          uuid primary key default gen_random_uuid(),
  aluno_id    uuid not null references kaha_alunos(id) on delete cascade,
  nome        text not null default 'Ficha',
  ativa       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists kaha_fichas_aluno_idx on kaha_fichas(aluno_id);

create table if not exists kaha_ficha_exercicios (
  id           uuid primary key default gen_random_uuid(),
  ficha_id     uuid not null references kaha_fichas(id) on delete cascade,
  nome         text not null,
  ordem        int not null default 0,
  series       int,
  reps_alvo    text,               -- ex.: "8-10" ou "até a falha"
  observacao   text,
  created_at   timestamptz not null default now()
);
create index if not exists kaha_ficha_exercicios_ficha_idx on kaha_ficha_exercicios(ficha_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Sessões (1/semana por aluno). Professor é definido POR SESSÃO (nullable).
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists kaha_sessoes (
  id             uuid primary key default gen_random_uuid(),
  aluno_id       uuid not null references kaha_alunos(id) on delete cascade,
  professor_id   uuid references kaha_professores(id) on delete set null,
  estado         kaha_sessao_estado not null default 'pendente',
  agendada_para  timestamptz,        -- data/horário combinado
  realizada_em   timestamptz,        -- preenchido quando estado = 'realizada'
  semana_ref     date not null default (date_trunc('week', now())::date), -- segunda-feira da semana
  observacoes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists kaha_sessoes_aluno_idx on kaha_sessoes(aluno_id);
create index if not exists kaha_sessoes_semana_idx on kaha_sessoes(semana_ref);
create index if not exists kaha_sessoes_estado_idx on kaha_sessoes(estado);

-- ────────────────────────────────────────────────────────────────────────────
-- Histórico de cargas (peso/reps por exercício) — memória para a concierge
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists kaha_cargas (
  id                   uuid primary key default gen_random_uuid(),
  aluno_id             uuid not null references kaha_alunos(id) on delete cascade,
  sessao_id            uuid references kaha_sessoes(id) on delete set null,
  ficha_exercicio_id   uuid references kaha_ficha_exercicios(id) on delete set null,
  exercicio            text not null,   -- redundante ao ficha_exercicio p/ resiliência histórica
  peso_kg              numeric(6,2),
  reps                 int,
  registrado_em        timestamptz not null default now(),
  observacao           text
);
create index if not exists kaha_cargas_aluno_idx on kaha_cargas(aluno_id, registrado_em desc);

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers de updated_at
-- ────────────────────────────────────────────────────────────────────────────
drop trigger if exists set_updated_at on kaha_professores;
create trigger set_updated_at before update on kaha_professores
  for each row execute function kaha_set_updated_at();

drop trigger if exists set_updated_at on kaha_alunos;
create trigger set_updated_at before update on kaha_alunos
  for each row execute function kaha_set_updated_at();

drop trigger if exists set_updated_at on kaha_fichas;
create trigger set_updated_at before update on kaha_fichas
  for each row execute function kaha_set_updated_at();

drop trigger if exists set_updated_at on kaha_sessoes;
create trigger set_updated_at before update on kaha_sessoes
  for each row execute function kaha_set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Semáforo de presença: uso das últimas 4 semanas
-- >= 3 realizadas = verde · 2 = âmbar · <= 1 = risco
-- View com security_invoker para respeitar a RLS de quem consulta.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view kaha_alunos_semaforo
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

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — habilitar e criar policy mínima (authenticated) em cada tabela
-- ────────────────────────────────────────────────────────────────────────────
alter table kaha_professores      enable row level security;
alter table kaha_alunos           enable row level security;
alter table kaha_fichas           enable row level security;
alter table kaha_ficha_exercicios enable row level security;
alter table kaha_sessoes          enable row level security;
alter table kaha_cargas           enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'kaha_professores','kaha_alunos','kaha_fichas',
    'kaha_ficha_exercicios','kaha_sessoes','kaha_cargas'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_authenticated_all', t);
    execute format(
      'create policy %I on %I for all to authenticated '
      'using (auth.uid() is not null) with check (auth.uid() is not null)',
      t || '_authenticated_all', t
    );
  end loop;
end $$;
