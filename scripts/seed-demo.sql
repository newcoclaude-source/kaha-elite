-- seed-demo.sql — dados de DEMONSTRAÇÃO realistas (marcados seed=true).
-- Re-executável: primeiro remove o seed anterior (não toca em dados reais),
-- depois insere professores + grade + alunos (metas 3/5) + sessões (histórico
-- de 4 semanas realizado + a semana atual em estados variados).
-- Requer a coluna seed (migration 0015). Limpeza: scripts/limpar-seed.sql.

begin;

-- 1) remove seed anterior (dependentes → raiz), preserva dados reais (seed=false)
delete from kaha_cargas where aluno_id in (select id from kaha_alunos where seed);
delete from kaha_feedbacks where sessao_id in (select id from kaha_sessoes where aluno_id in (select id from kaha_alunos where seed) or professor_id in (select id from kaha_professores where seed));
delete from kaha_mensagens where aluno_id in (select id from kaha_alunos where seed);
delete from kaha_ficha_exercicios where ficha_id in (select id from kaha_fichas where aluno_id in (select id from kaha_alunos where seed));
delete from kaha_fichas where aluno_id in (select id from kaha_alunos where seed);
delete from kaha_sessoes where aluno_id in (select id from kaha_alunos where seed) or professor_id in (select id from kaha_professores where seed);
delete from kaha_horarios where professor_id in (select id from kaha_professores where seed);
delete from kaha_alunos where seed;
delete from kaha_professores where seed;
delete from kaha_planos where seed;

-- 2) professores
insert into kaha_professores (nome, especialidade, telefone, ativo, seed) values
 ('Rafael','Força e hipertrofia','5511971221994',true,true),
 ('Bruna','Emagrecimento e funcional','5511971221994',true,true),
 ('Diego','Performance e condicionamento','5511971221994',true,true);

-- 3) grade: 3 profs × Seg..Sáb × 8 horas
insert into kaha_horarios (professor_id, dia_semana, hora)
select p.id, d.dia, h.hora
from kaha_professores p
cross join (select unnest(array[1,2,3,4,5,6]) as dia) d
cross join (select unnest(array['07:00','08:00','09:00','10:00','11:00','17:00','18:00','19:00']::time[]) as hora) h
where p.seed;

-- 4) alunos (metas 3/5)
insert into kaha_alunos (nome, telefone, ativo, meta_semanal, objetivo, preferencias, entrou_em, seed) values
 ('Eduardo Rocha','5511971221994',true,3,'Hipertrofia','Gosta de treino puxado de manhã cedo',(now()-interval '8 months')::date,true),
 ('Daniela Martins','5511971221994',true,3,'Performance',null,(now()-interval '6 months')::date,true),
 ('Camila Duarte','5511971221994',true,5,'Emagrecimento','Prefere funcional; evita agachamento pesado (joelho)',(now()-interval '5 months')::date,true),
 ('Lucas Brandão','5511971221994',true,5,'Hipertrofia',null,(now()-interval '3 months')::date,true),
 ('Marcelo Silva','5511971221994',true,3,'Condicionamento','Reclamou do joelho no leg press',(now()-interval '4 months')::date,true),
 ('Rafaela Antunes','5511971221994',true,3,'Emagrecimento',null,(now()-interval '2 months')::date,true),
 ('Julio Prado','5511971221994',true,3,'Hipertrofia',null,(now()-interval '7 months')::date,true),
 ('Fernanda Tavares','5511971221994',true,5,'Performance','Anda desanimada — puxar pela presença',(now()-interval '9 months')::date,true);

-- 4b) planos (Convencional=3, Elite=5) + vínculo pela meta que o aluno tem
insert into kaha_planos (nome, meta_semanal, seed)
select v.nome, v.meta, true from (values ('Convencional',3),('Elite',5)) v(nome,meta)
where not exists (select 1 from kaha_planos where seed);
update kaha_alunos a set plano_id = p.id
  from kaha_planos p
 where a.seed and a.plano_id is null and p.seed and p.meta_semanal = a.meta_semanal;

-- 4c) gênero + fichas (Fernanda e Julio SEM ficha — são os "em risco", coerente)
update kaha_alunos set genero = m.g from (values
  ('Eduardo Rocha','m'),('Daniela Martins','f'),('Camila Duarte','f'),('Lucas Brandão','m'),
  ('Marcelo Silva','m'),('Rafaela Antunes','f'),('Julio Prado','m'),('Fernanda Tavares','f')
) m(nome,g) where kaha_alunos.nome = m.nome and kaha_alunos.seed;

insert into kaha_fichas (aluno_id, nome, ativa, objetivo, divisao)
select a.id, d.divisao, true, a.objetivo, d.divisao
from kaha_alunos a
join (values
  ('Eduardo Rocha','Peito e tríceps'),('Daniela Martins','Costas e bíceps'),
  ('Camila Duarte','Pernas e glúteos'),('Lucas Brandão','Ombros e abdômen'),
  ('Marcelo Silva','Full body'),('Rafaela Antunes','Glúteos e pernas')
) d(nome,divisao) on d.nome = a.nome
where a.seed;

insert into kaha_ficha_exercicios (ficha_id, nome, biblioteca_id, ordem, series, reps_alvo)
select f.id, x.nome, x.id, x.rn, 3, '10-12'
from kaha_fichas f
join kaha_alunos a on a.id = f.aluno_id and a.seed
join lateral (
  select b.id, b.nome, row_number() over (order by b.grupo, b.nome) as rn
  from kaha_exercicios_biblioteca b
  where b.ativo and b.grupo = any(case f.divisao
    when 'Peito e tríceps' then array['Peito','Tríceps']
    when 'Costas e bíceps' then array['Costas','Bíceps']
    when 'Pernas e glúteos' then array['Pernas','Glúteos']
    when 'Ombros e abdômen' then array['Ombros','Abdômen']
    when 'Full body' then array['Peito','Costas','Pernas']
    when 'Glúteos e pernas' then array['Glúteos','Pernas'] end)
  order by b.grupo, b.nome limit 6
) x on true;

-- 5) histórico realizado (4 semanas anteriores, home slots distintos por aluno)
with monday as (select date_trunc('week',(now() at time zone 'America/Sao_Paulo'))::date as wk),
home(aluno,prof,dia,hora) as (values
  ('Eduardo Rocha','Rafael',1,'07:00'::time),('Eduardo Rocha','Rafael',3,'07:00'),('Eduardo Rocha','Rafael',5,'07:00'),
  ('Daniela Martins','Rafael',1,'08:00'),('Daniela Martins','Rafael',3,'08:00'),('Daniela Martins','Rafael',5,'08:00'),
  ('Camila Duarte','Bruna',1,'17:00'),('Camila Duarte','Bruna',2,'17:00'),('Camila Duarte','Bruna',3,'17:00'),('Camila Duarte','Bruna',4,'17:00'),
  ('Lucas Brandão','Bruna',1,'18:00'),('Lucas Brandão','Bruna',3,'18:00'),
  ('Marcelo Silva','Diego',2,'08:00'),('Marcelo Silva','Diego',4,'08:00'),
  ('Rafaela Antunes','Diego',2,'09:00'))
insert into kaha_sessoes (aluno_id, professor_id, estado, dia_semana, hora, semana_ref, agendada_para, realizada_em)
select a.id, p.id, 'realizada'::kaha_sessao_estado, h.dia, h.hora,
  (m.wk - w.off*7),
  ((m.wk - w.off*7) + (h.dia-1) + h.hora) at time zone 'America/Sao_Paulo',
  ((m.wk - w.off*7) + (h.dia-1) + h.hora) at time zone 'America/Sao_Paulo'
from home h
join kaha_alunos a on a.nome=h.aluno
join kaha_professores p on p.nome=h.prof
cross join monday m
cross join (select generate_series(1,4) as off) w;

-- 6) semana atual (estados variados; Julio e Fernanda ficam sem sessão)
with monday as (select date_trunc('week',(now() at time zone 'America/Sao_Paulo'))::date as wk),
tw(aluno,prof,dia,hora,estado) as (values
  ('Eduardo Rocha','Rafael',1,'07:00'::time,'realizada'),('Eduardo Rocha','Rafael',3,'07:00','realizada'),('Eduardo Rocha','Rafael',5,'07:00','confirmada'),
  ('Daniela Martins','Rafael',1,'08:00','realizada'),('Daniela Martins','Rafael',3,'08:00','confirmada'),('Daniela Martins','Rafael',5,'08:00','agendada'),
  ('Camila Duarte','Bruna',1,'17:00','realizada'),('Camila Duarte','Bruna',2,'17:00','confirmada'),('Camila Duarte','Bruna',4,'17:00','agendada'),
  ('Lucas Brandão','Bruna',1,'18:00','confirmada'),('Lucas Brandão','Bruna',3,'18:00','agendada'),
  ('Marcelo Silva','Diego',2,'08:00','confirmada'),('Marcelo Silva','Diego',4,'08:00','agendada'),
  ('Rafaela Antunes','Diego',2,'09:00','agendada'))
insert into kaha_sessoes (aluno_id, professor_id, estado, dia_semana, hora, semana_ref, agendada_para, realizada_em)
select a.id, p.id, t.estado::kaha_sessao_estado, t.dia, t.hora, m.wk,
  (m.wk + (t.dia-1) + t.hora) at time zone 'America/Sao_Paulo',
  case when t.estado='realizada' then now() - interval '2 hours' else null end
from tw t
join kaha_alunos a on a.nome=t.aluno
join kaha_professores p on p.nome=t.prof
cross join monday m;

-- 7) ambiente demo é um ambiente CONCLUÍDO (o wizard não abre por cima do demo)
update kaha_config set onboarding_concluido = true where id;

commit;
