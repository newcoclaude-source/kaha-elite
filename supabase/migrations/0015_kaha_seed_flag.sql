-- 0015_kaha_seed_flag.sql
-- Marca linhas de DEMONSTRAÇÃO (seed=true) para limpeza cirúrgica antes da
-- entrega real ao CT. O gestor importa o Excel dele pelo wizard = linhas com
-- seed=false, que sobrevivem à limpeza. Aditivo, default false (dados reais).
alter table kaha_alunos      add column if not exists seed boolean not null default false;
alter table kaha_professores add column if not exists seed boolean not null default false;
