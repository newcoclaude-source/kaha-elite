-- Kaha Elite — B3: salvar ficha de forma transacional.
-- Upsert da ficha ativa do aluno + substituição total dos exercícios (apaga os
-- antigos e reinsere na ordem recebida). Função = 1 transação → sem órfãos.
-- security invoker → roda com a RLS de quem chama (authenticated).

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

  -- Substituição transacional: limpa e reinsere na ordem.
  delete from kaha_ficha_exercicios where ficha_id = v_ficha_id;

  for v_ex in
    select * from jsonb_array_elements(coalesce(p_exercicios, '[]'::jsonb))
  loop
    -- Ignora linhas sem nome.
    if coalesce(trim(v_ex->>'nome'), '') <> '' then
      insert into kaha_ficha_exercicios
        (ficha_id, nome, ordem, series, reps_alvo, carga_alvo)
      values (
        v_ficha_id,
        trim(v_ex->>'nome'),
        v_ordem,
        nullif(v_ex->>'series', '')::int,
        nullif(trim(v_ex->>'reps_alvo'), ''),
        nullif(trim(v_ex->>'carga_alvo'), '')
      );
      v_ordem := v_ordem + 1;
    end if;
  end loop;

  return v_ficha_id;
end;
$$;

revoke all on function kaha_salvar_ficha(uuid, text, text, jsonb) from public;
grant execute on function kaha_salvar_ficha(uuid, text, text, jsonb) to authenticated;
