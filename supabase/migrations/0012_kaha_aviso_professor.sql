-- Kaha Elite — novo movimento: aviso ao professor (aula de hoje). Libera o tipo
-- 'aviso_professor' nas checks de kaha_templates e kaha_mensagens e semeia o texto.

alter table kaha_templates drop constraint kaha_templates_tipo_check;
alter table kaha_templates add constraint kaha_templates_tipo_check
  check (tipo in ('confirmacao','pre_treino','pos_treino','presenca','renovacao','resgate','agendamento','aviso_professor'));

alter table kaha_mensagens drop constraint kaha_mensagens_tipo_check;
alter table kaha_mensagens add constraint kaha_mensagens_tipo_check
  check (tipo in ('confirmacao','pre_treino','pos_treino','presenca','renovacao','resgate','agendamento','aviso_professor'));

insert into kaha_templates (tipo, conteudo) values
  ('aviso_professor', 'Fala {professor}! Hoje você tem treino com {aluno} às {hora} 💪 Ele tá em {treino_do_dia}. Última sessão dele: {ultima_carga}. Bora!')
on conflict (tipo) do update set conteudo = excluded.conteudo, updated_at = now();
