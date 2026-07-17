-- 0020_kaha_genero_e_templates.sql — correções de concordância/gênero da Julia.
-- Bugs de demo do walkthrough:
--  1) fallback "Seu seu treino": o motor passa treino_do_dia='treino' (fila.ts),
--     e o resgate diz "Seu {treino_do_dia} tá esperando" → "Seu treino tá esperando".
--  2) gênero: coluna genero (m/f/null); {chamada} flexiona sumido!/sumida!/neutro.
--  3) aviso ao professor: última carga vira frase OPCIONAL {ultima_sessao}; sem
--     dado, o motor passa "" e a frase some (nunca "um bom peso").

alter table kaha_alunos add column if not exists genero text check (genero in ('m','f'));

update kaha_templates
set conteudo = '{nome}, {chamada} 😅 Seu {treino_do_dia} tá esperando aqui. Tenho esses horários livres: {horarios_livres}. Qual fica melhor?',
    updated_at = now()
where tipo = 'resgate';

update kaha_templates
set conteudo = 'Fala {professor}! Hoje você tem treino com {aluno} às {hora} 💪 Ele tá em {treino_do_dia}. {ultima_sessao}Bora!',
    updated_at = now()
where tipo = 'aviso_professor';
