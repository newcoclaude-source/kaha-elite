-- Kaha Elite — B4: sessões marcáveis em slot da grade + registro de carga por série.

-- ── Sessões: dia/hora explícitos (slot da grade) — evita derivar de timestamptz
-- e errar a semana por timezone. semana_ref continua a segunda-feira. ──────────
alter table kaha_sessoes add column if not exists dia_semana int
  check (dia_semana between 0 and 6);
alter table kaha_sessoes add column if not exists hora time;

-- Um slot (professor+dia+hora) só pode ter UMA sessão viva por semana.
-- Índice parcial = backstop contra dupla-marcação mesmo sob concorrência.
create unique index if not exists kaha_sessoes_slot_uniq
  on kaha_sessoes (professor_id, dia_semana, hora, semana_ref)
  where estado <> 'cancelada';

-- ── Cargas: uma linha por (sessão, exercício da ficha, série). ────────────────
alter table kaha_cargas add column if not exists serie int;

create unique index if not exists kaha_cargas_serie_uniq
  on kaha_cargas (sessao_id, ficha_exercicio_id, serie);

-- Upsert rápido e server-side: deriva aluno_id (da sessão) e o nome do exercício
-- (desnormalizado, sobrevive à edição da ficha). Idempotente por (sessão,ex,série).
create or replace function kaha_registrar_carga(
  p_sessao_id    uuid,
  p_exercicio_id uuid,
  p_serie        int,
  p_reps         int,
  p_carga        numeric
) returns void
language plpgsql
security invoker
as $$
declare
  v_aluno uuid;
  v_nome  text;
begin
  select aluno_id into v_aluno from kaha_sessoes where id = p_sessao_id;
  if v_aluno is null then
    raise exception 'Sessão inexistente';
  end if;

  select nome into v_nome from kaha_ficha_exercicios where id = p_exercicio_id;

  insert into kaha_cargas
    (aluno_id, sessao_id, ficha_exercicio_id, exercicio, serie, reps, peso_kg, registrado_em)
  values
    (v_aluno, p_sessao_id, p_exercicio_id, coalesce(v_nome, 'Exercício'),
     p_serie, p_reps, p_carga, now())
  on conflict (sessao_id, ficha_exercicio_id, serie)
  do update set
    reps = excluded.reps,
    peso_kg = excluded.peso_kg,
    exercicio = excluded.exercicio,
    registrado_em = now();
end;
$$;

revoke all on function kaha_registrar_carga(uuid, uuid, int, int, numeric) from public;
grant execute on function kaha_registrar_carga(uuid, uuid, int, int, numeric) to authenticated;
