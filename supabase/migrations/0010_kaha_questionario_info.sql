-- Kaha Elite — UI-3: RPC pública de leitura do questionário (só o 1º nome + status).
-- Complementa kaha_responder_questionario (0008). Nunca expõe dado além do primeiro
-- nome. security definer + search_path fixo; tabelas seguem fechadas pra anon.
create or replace function kaha_questionario_info(p_token uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare v_sessao uuid; v_nome text; v_respondido boolean;
begin
  select s.id, a.nome into v_sessao, v_nome
    from kaha_sessoes s
    join kaha_alunos a on a.id = s.aluno_id
    where s.feedback_token = p_token and s.estado = 'realizada';

  if v_sessao is null then
    return json_build_object('valido', false);
  end if;

  select exists (
    select 1 from kaha_feedbacks where sessao_id = v_sessao and origem = 'aluno'
  ) into v_respondido;

  return json_build_object(
    'valido', true,
    'nome', split_part(coalesce(v_nome, ''), ' ', 1),  -- só o primeiro nome
    'respondido', v_respondido
  );
end $$;

revoke all on function kaha_questionario_info(uuid) from public;
grant execute on function kaha_questionario_info(uuid) to anon, authenticated;
