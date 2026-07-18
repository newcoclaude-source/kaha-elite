-- Kaha Elite — Fase 3 (Teste da Julia): registro de PEDIDOS DE AÇÃO.
-- Decisão travada: a Julia RESPONDE mas NÃO EXECUTA. Quando um aluno pede uma
-- ação (agendar/marcar/remarcar/cancelar/trocar horário), a concierge acolhe e
-- diz que confirma com a equipe — e o pedido fica registrado aqui para o humano
-- resolver. Nada é agendado/alterado automaticamente.
--
-- Aditiva e idempotente. Só tabela kaha_*. RLS authenticated-only (convenção do
-- repo: for all to authenticated, using auth.uid() is not null).

create table if not exists kaha_julia_pendencias (
  id uuid primary key default gen_random_uuid(),
  pedido text not null,                    -- a mensagem do aluno (pedido cru)
  resumo text,                             -- resumo curto do que foi pedido
  origem text not null default 'chat_teste',
  aluno_id uuid references kaha_alunos(id) on delete set null,
  resolvido boolean not null default false,
  seed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table kaha_julia_pendencias enable row level security;
drop policy if exists kaha_julia_pendencias_authenticated_all on kaha_julia_pendencias;
create policy kaha_julia_pendencias_authenticated_all on kaha_julia_pendencias
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
