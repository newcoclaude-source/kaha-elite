-- Kaha Elite — D5 (parte 1): padrão de mensagem por tipo (voz da Julia).
-- Só a tabela kaha_templates. kaha_config/kaha_movimentos/kaha_faq entram na 0012.
-- RLS authenticated-only (convenção do repo). Seed com os textos definitivos.

create table if not exists kaha_templates (
  tipo text primary key check (tipo in
    ('confirmacao','pre_treino','pos_treino','presenca','renovacao','resgate','agendamento')),
  conteudo text not null,
  updated_at timestamptz default now()
);

alter table kaha_templates enable row level security;
drop policy if exists kaha_templates_authenticated_all on kaha_templates;
create policy kaha_templates_authenticated_all on kaha_templates
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

insert into kaha_templates (tipo, conteudo) values
  ('confirmacao', 'Oi {nome}! Aqui é a Julia, do time Kaha Elite 👋 Sua sessão é {dia} às {hora} com {professor}. Tá de pé?'),
  ('pre_treino', 'Bora, monstro! Hoje é {treino_do_dia} com {professor} 💪 Na última você mandou {ultima_carga} — bora passar disso hoje. Come bem antes e chega com sede de treino!'),
  ('pos_treino', 'E aí {nome}, como foi o treino de hoje? Conta rapidinho pra gente, leva 30 segundos: {link_q}'),
  ('resgate', '{nome}, sumido! 😅 Seu {treino_do_dia} tá esperando aqui. Tenho esses horários livres: {horarios_livres}. Qual fica melhor?'),
  ('presenca', '{nome}, dica rápida: nos dias sem treino, caprichar na proteína faz metade do trabalho 💪 Como tá a semana aí?'),
  ('renovacao', '{nome}, passando pra avisar que seu Elite renova em {dias_para_vencer} dias. Tá gostando do acompanhamento? Qualquer coisa que queira ajustar, é só falar.')
on conflict (tipo) do update
  set conteudo = excluded.conteudo, updated_at = now();
