-- limpar-seed.sql — LIMPEZA PRÉ-ENTREGA
-- Remove TODO o dado de demonstração (marcado seed=true) e seus dependentes,
-- deixando a base pronta para o gestor importar o Excel dele pelo wizard.
--
-- Mantém intactas as tabelas de referência: kaha_templates, kaha_config,
-- kaha_movimentos, kaha_faq, kaha_exercicios_biblioteca.
-- Só apaga o que é seed — dados reais (seed=false) NÃO são tocados.
--
-- Como rodar: Supabase → SQL Editor → cole e execute. (Ou peça pro Claude rodar.)

begin;

delete from kaha_cargas
  where aluno_id in (select id from kaha_alunos where seed);

delete from kaha_feedbacks
  where sessao_id in (
    select id from kaha_sessoes
    where aluno_id in (select id from kaha_alunos where seed)
       or professor_id in (select id from kaha_professores where seed)
  );

delete from kaha_mensagens
  where aluno_id in (select id from kaha_alunos where seed);

delete from kaha_ficha_exercicios
  where ficha_id in (
    select id from kaha_fichas where aluno_id in (select id from kaha_alunos where seed)
  );

delete from kaha_fichas
  where aluno_id in (select id from kaha_alunos where seed);

delete from kaha_sessoes
  where aluno_id in (select id from kaha_alunos where seed)
     or professor_id in (select id from kaha_professores where seed);

delete from kaha_horarios
  where professor_id in (select id from kaha_professores where seed);

delete from kaha_alunos      where seed;
delete from kaha_professores where seed;
delete from kaha_planos      where seed;

-- reseta o estado do wizard para NÃO-concluído: o gestor vive o onboarding do zero
update kaha_config set onboarding_concluido = false where id;

commit;
