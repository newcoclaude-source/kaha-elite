-- Kaha Elite — B3.5: biblioteca de exercícios (musculação tradicional) + seletor.
-- Seed base (custom=false). Exercícios da ficha ganham referência opcional à
-- biblioteca, guardando o nome desnormalizado (ficha não quebra se um exercício
-- da base for desativado). RLS authenticated-only (mesma convenção de 0001).

-- ── Tabela ───────────────────────────────────────────────────────────────────
create table if not exists kaha_exercicios_biblioteca (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  grupo        text not null,          -- Peito, Costas, Pernas, Ombros, Bíceps, Tríceps, Abdômen, Glúteos
  equipamento  text,                   -- Barra, Halteres, Máquina, Polia, Cabo, Peso corporal
  custom       boolean not null default false,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists kaha_exercicios_biblioteca_grupo_idx
  on kaha_exercicios_biblioteca (grupo);

alter table kaha_exercicios_biblioteca enable row level security;
drop policy if exists kaha_exercicios_biblioteca_authenticated_all
  on kaha_exercicios_biblioteca;
create policy kaha_exercicios_biblioteca_authenticated_all
  on kaha_exercicios_biblioteca
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ── Referência opcional na ficha ─────────────────────────────────────────────
alter table kaha_ficha_exercicios
  add column if not exists biblioteca_id uuid
  references kaha_exercicios_biblioteca(id) on delete set null;

-- ── salvarFicha: passa a persistir biblioteca_id (continua transacional) ──────
create or replace function kaha_salvar_ficha(
  p_aluno_id uuid,
  p_objetivo text,
  p_divisao  text,
  p_exercicios jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_ficha_id uuid;
  v_ex jsonb;
  v_ordem int := 0;
begin
  select id into v_ficha_id
    from kaha_fichas
    where aluno_id = p_aluno_id and ativa = true
    order by created_at
    limit 1;

  if v_ficha_id is null then
    insert into kaha_fichas (aluno_id, objetivo, divisao)
      values (p_aluno_id, p_objetivo, p_divisao)
      returning id into v_ficha_id;
  else
    update kaha_fichas
      set objetivo = p_objetivo, divisao = p_divisao
      where id = v_ficha_id;
  end if;

  delete from kaha_ficha_exercicios where ficha_id = v_ficha_id;

  for v_ex in
    select * from jsonb_array_elements(coalesce(p_exercicios, '[]'::jsonb))
  loop
    if coalesce(trim(v_ex->>'nome'), '') <> '' then
      insert into kaha_ficha_exercicios
        (ficha_id, nome, ordem, series, reps_alvo, carga_alvo, biblioteca_id)
      values (
        v_ficha_id,
        trim(v_ex->>'nome'),
        v_ordem,
        nullif(v_ex->>'series', '')::int,
        nullif(trim(v_ex->>'reps_alvo'), ''),
        nullif(trim(v_ex->>'carga_alvo'), ''),
        nullif(v_ex->>'biblioteca_id', '')::uuid
      );
      v_ordem := v_ordem + 1;
    end if;
  end loop;

  return v_ficha_id;
end;
$$;

revoke all on function kaha_salvar_ficha(uuid, text, text, jsonb) from public;
grant execute on function kaha_salvar_ficha(uuid, text, text, jsonb) to authenticated;

-- ── Seed base (idempotente: só insere o que ainda não existe) ─────────────────
insert into kaha_exercicios_biblioteca (nome, grupo, equipamento, custom)
select v.nome, v.grupo, v.equip, false
from (values
  -- Peito
  ('Supino reto','Peito','Barra'),
  ('Supino inclinado','Peito','Barra'),
  ('Supino declinado','Peito','Barra'),
  ('Supino reto','Peito','Halteres'),
  ('Supino inclinado','Peito','Halteres'),
  ('Crucifixo reto','Peito','Halteres'),
  ('Crucifixo inclinado','Peito','Halteres'),
  ('Crossover','Peito','Cabo'),
  ('Voador/Peck deck','Peito','Máquina'),
  ('Flexão de braço','Peito','Peso corporal'),
  ('Supino máquina','Peito','Máquina'),
  -- Costas
  ('Puxada frente','Costas','Polia'),
  ('Puxada atrás','Costas','Polia'),
  ('Remada curvada','Costas','Barra'),
  ('Remada unilateral','Costas','Halteres'),
  ('Remada cavalinho','Costas','Máquina'),
  ('Remada baixa','Costas','Polia'),
  ('Barra fixa','Costas','Peso corporal'),
  ('Pulldown','Costas','Polia'),
  ('Levantamento terra','Costas','Barra'),
  ('Remada máquina','Costas','Máquina'),
  ('Pullover','Costas','Halteres'),
  -- Pernas
  ('Agachamento livre','Pernas','Barra'),
  ('Agachamento smith','Pernas','Máquina'),
  ('Leg press 45°','Pernas','Máquina'),
  ('Cadeira extensora','Pernas','Máquina'),
  ('Cadeira flexora','Pernas','Máquina'),
  ('Mesa flexora','Pernas','Máquina'),
  ('Afundo','Pernas','Halteres'),
  ('Passada','Pernas','Halteres'),
  ('Stiff','Pernas','Barra'),
  ('Agachamento hack','Pernas','Máquina'),
  ('Panturrilha em pé','Pernas','Máquina'),
  ('Panturrilha sentado','Pernas','Máquina'),
  ('Cadeira adutora','Pernas','Máquina'),
  ('Cadeira abdutora','Pernas','Máquina'),
  ('Búlgaro','Pernas','Halteres'),
  -- Ombros
  ('Desenvolvimento','Ombros','Barra'),
  ('Desenvolvimento','Ombros','Halteres'),
  ('Desenvolvimento Arnold','Ombros','Halteres'),
  ('Elevação lateral','Ombros','Halteres'),
  ('Elevação frontal','Ombros','Halteres'),
  ('Elevação lateral','Ombros','Polia'),
  ('Crucifixo inverso','Ombros','Máquina'),
  ('Encolhimento','Ombros','Halteres'),
  ('Remada alta','Ombros','Barra'),
  ('Desenvolvimento máquina','Ombros','Máquina'),
  -- Bíceps
  ('Rosca direta','Bíceps','Barra'),
  ('Rosca direta','Bíceps','Halteres'),
  ('Rosca alternada','Bíceps','Halteres'),
  ('Rosca martelo','Bíceps','Halteres'),
  ('Rosca scott','Bíceps','Barra'),
  ('Rosca concentrada','Bíceps','Halteres'),
  ('Rosca no cabo','Bíceps','Polia'),
  ('Rosca 21','Bíceps','Barra'),
  -- Tríceps
  ('Tríceps testa','Tríceps','Barra'),
  ('Tríceps corda','Tríceps','Polia'),
  ('Tríceps pulley','Tríceps','Polia'),
  ('Tríceps francês','Tríceps','Halteres'),
  ('Mergulho/Paralelas','Tríceps','Peso corporal'),
  ('Tríceps coice','Tríceps','Halteres'),
  ('Tríceps banco','Tríceps','Peso corporal'),
  ('Supino fechado','Tríceps','Barra'),
  -- Abdômen
  ('Abdominal supra','Abdômen','Peso corporal'),
  ('Abdominal infra','Abdômen','Peso corporal'),
  ('Prancha','Abdômen','Peso corporal'),
  ('Abdominal máquina','Abdômen','Máquina'),
  ('Elevação de pernas','Abdômen','Peso corporal'),
  ('Abdominal oblíquo','Abdômen','Peso corporal'),
  ('Rotação russa','Abdômen','Peso corporal'),
  -- Glúteos
  ('Elevação pélvica/Hip thrust','Glúteos','Barra'),
  ('Glúteo no cabo','Glúteos','Polia'),
  ('Coice glúteo','Glúteos','Máquina'),
  ('Agachamento sumô','Glúteos','Halteres')
) as v(nome, grupo, equip)
where not exists (
  select 1 from kaha_exercicios_biblioteca b
  where b.nome = v.nome and b.grupo = v.grupo
    and coalesce(b.equipamento, '') = coalesce(v.equip, '')
);
