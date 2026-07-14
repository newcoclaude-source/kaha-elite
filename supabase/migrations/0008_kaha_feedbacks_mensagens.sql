-- Kaha Elite — delta do PLANO_MESTRE_V2: feedback estruturado (aluno+professor),
-- mensagens da Julia, token público do questionário, preferências do aluno e a
-- RPC pública (única porta anon do sistema). RLS authenticated nas tabelas;
-- o acesso anon acontece SÓ via RPC security definer (nunca abre tabela pra anon).

-- ── Feedbacks (aluno e professor) — criada aqui (não existia no B0–B4) ─────────
create table if not exists kaha_feedbacks (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references kaha_sessoes(id) on delete cascade,
  origem text not null check (origem in ('aluno','professor')),
  -- aluno
  nota_treino int check (nota_treino between 1 and 5),
  gostou_exercicios text,
  comentario text,
  -- professor
  empenho int check (empenho between 1 and 5),
  evolucao text check (evolucao in ('evoluiu','manteve','regrediu')),
  dor_queixa text,
  risco_percebido text check (risco_percebido in ('nao','talvez','sim')),
  created_at timestamptz default now(),
  unique (sessao_id, origem)   -- 1 resposta por sessão por origem, garantida no banco
);
create index if not exists kaha_feedbacks_sessao_idx on kaha_feedbacks (sessao_id);

-- ── Mensagens da Julia (copiloto) — criada junto p/ não deixar migration órfã ──
create table if not exists kaha_mensagens (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references kaha_alunos(id) on delete cascade,
  tipo text not null check (tipo in
    ('confirmacao','pre_treino','pos_treino','presenca','renovacao','resgate','agendamento')),
  conteudo text not null,
  status text not null default 'sugerida'
    check (status in ('sugerida','enviada','descartada')),
  created_at timestamptz default now()
);
create index if not exists kaha_mensagens_aluno_idx
  on kaha_mensagens (aluno_id, created_at desc);

-- ── Token público do questionário (um por sessão) + preferências do aluno ─────
alter table kaha_sessoes
  add column if not exists feedback_token uuid unique default gen_random_uuid();
alter table kaha_alunos
  add column if not exists preferencias text;

-- ── RLS authenticated-only nas duas tabelas novas ────────────────────────────
alter table kaha_feedbacks enable row level security;
drop policy if exists kaha_feedbacks_authenticated_all on kaha_feedbacks;
create policy kaha_feedbacks_authenticated_all on kaha_feedbacks
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table kaha_mensagens enable row level security;
drop policy if exists kaha_mensagens_authenticated_all on kaha_mensagens;
create policy kaha_mensagens_authenticated_all on kaha_mensagens
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ── RPC pública do questionário do aluno (única porta anon; security definer) ──
-- Valida o token (sessão realizada), impede resposta duplicada (check + unique
-- no banco) e insere o feedback de origem 'aluno'. Não vaza dado nenhum.
create or replace function kaha_responder_questionario(
  p_token uuid, p_nota int, p_gostou text, p_mudaria text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_sessao uuid; v_aluno uuid;
begin
  select id, aluno_id into v_sessao, v_aluno from kaha_sessoes
    where feedback_token = p_token and estado = 'realizada';
  if v_sessao is null then return false; end if;

  if exists (select 1 from kaha_feedbacks where sessao_id = v_sessao and origem = 'aluno')
    then return false; end if;

  begin
    insert into kaha_feedbacks (sessao_id, origem, nota_treino, gostou_exercicios, comentario)
      values (v_sessao, 'aluno', p_nota, p_gostou, p_mudaria);
  exception when unique_violation then
    return false; -- corrida: outra resposta entrou primeiro
  end;

  return true;
end $$;

revoke all on function kaha_responder_questionario(uuid, int, text, text) from public;
grant execute on function kaha_responder_questionario(uuid, int, text, text) to anon, authenticated;
