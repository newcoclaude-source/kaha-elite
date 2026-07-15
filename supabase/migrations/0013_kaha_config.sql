-- 0013_kaha_config.sql
-- Tabelas de configuração da Julia: kaha_config (singleton) + kaha_movimentos + kaha_faq.
-- (kaha_templates + os 6 textos já vieram na 0011; NÃO recriar aqui.)
--
-- Correção ao PLANO_DESIGN (precedência do João sobre o arquivo):
--   1) A migration de configuração saiu do D5 e entrou no D0 — o D6 (fila da Julia)
--      depende de kaha_templates E kaha_movimentos; deixá-la no D5 quebrava a ordem.
--   2) Número NÃO hardcoded como 0011: 0001–0012 já existem, então esta é a 0013.
--
-- Só tabelas com prefixo kaha_. RLS authenticated-only (convenção do repo:
-- for all to authenticated, using auth.uid() is not null). Aditiva e idempotente.

-- singleton de configuração da voz/regras da Julia
create table if not exists kaha_config (
  id boolean primary key default true check (id),
  julia_nome text default 'Julia',
  julia_apresentacao text default 'Julia, do time Kaha Elite',
  saudacao text,
  tom text default 'proximo' check (tom in ('proximo','energia','premium')),
  emoji text default 'moderado' check (emoji in ('avontade','moderado','quase_nenhum')),
  nunca_fazer text,
  numero_elite text,
  janela_inicio time default '08:00',
  janela_fim time default '20:00',
  janela_domingo boolean default false,
  duracao_min int default 60 check (duracao_min in (30,45,60)),
  sessoes_semana int default 1,
  antecedencia_marcar text,
  prazo_cancelar text,
  sessao_extra text default 'se_houver_vaga'
    check (sessao_extra in ('nao','se_houver_vaga','cobrando')),
  dois_alunos_mesmo_horario boolean default false,
  plano_nome text default 'Kaha Elite',
  funcionamento text,
  orgulho text,
  escalar_dor boolean default true,
  escalar_reclamacao boolean default true,
  escalar_cancelamento boolean default true,
  escalar_valores boolean default true,
  resposta_valores text,
  escalar_contato text,
  updated_at timestamptz default now()
);
insert into kaha_config (id) values (true) on conflict do nothing;

-- movimentos da Julia ligados/desligados (D5 troca a FONTE em lib/julia/config.ts)
create table if not exists kaha_movimentos (
  chave text primary key,
  ativo boolean default true
);
insert into kaha_movimentos (chave, ativo) values
  ('escolha_professor',true),('agendamento',true),('confirmacao',true),
  ('pre_treino',true),('pos_treino_aluno',true),('pos_treino_professor',true),
  ('presenca',true),('resgate',false),('renovacao',false)
on conflict (chave) do nothing;

-- perguntas frequentes da academia (editável na tela de Configurações)
create table if not exists kaha_faq (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  resposta text not null,
  ordem int default 0
);

-- RLS authenticated-only (mesma convenção de kaha_templates_authenticated_all na 0011)
alter table kaha_config enable row level security;
drop policy if exists kaha_config_authenticated_all on kaha_config;
create policy kaha_config_authenticated_all on kaha_config
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table kaha_movimentos enable row level security;
drop policy if exists kaha_movimentos_authenticated_all on kaha_movimentos;
create policy kaha_movimentos_authenticated_all on kaha_movimentos
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table kaha_faq enable row level security;
drop policy if exists kaha_faq_authenticated_all on kaha_faq;
create policy kaha_faq_authenticated_all on kaha_faq
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
