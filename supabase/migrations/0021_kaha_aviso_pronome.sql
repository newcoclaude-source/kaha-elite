-- 0021_kaha_aviso_pronome.sql — CORRETIVA (NÃO edita a 0020; migration aplicada
-- é registro histórico do que rodou — correção é sempre migration nova).
--
-- A 0020 semeou o template aviso_professor com "Ele tá em" fixo. O 2b (aplicado
-- direto no banco em 18/jul, pós-deploy do hotfix) trocou "Ele tá em" por
-- "{pronome} tá em" (o código 2a já provê {pronome} = Ele/Ela). Esta migration
-- registra esse estado no histórico. IDEMPOTENTE: o WHERE só casa se o texto
-- ainda estiver diferente, então rodar de novo (banco já nesse estado) não muda
-- nada — nem o updated_at.

update kaha_templates
set conteudo = 'Fala {professor}! Hoje você tem treino com {aluno} às {hora} 💪 {pronome} tá em {treino_do_dia}. {ultima_sessao}Bora!',
    updated_at = now()
where tipo = 'aviso_professor'
  and conteudo is distinct from
    'Fala {professor}! Hoje você tem treino com {aluno} às {hora} 💪 {pronome} tá em {treino_do_dia}. {ultima_sessao}Bora!';
