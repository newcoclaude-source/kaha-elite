-- 0018_kaha_meta_semanal_nullable.sql
-- Aluno importado SEM plano casado fica com meta_semanal NULL (a capacidade soma
-- 0 para ele; o semáforo o trata como risco — a view kaha_alunos_semaforo já
-- cobre null desde a 0016). Sem isso, o import de um aluno "Sem plano" viola o
-- NOT NULL herdado da 0014. O CHECK (meta is null or meta > 0) já permitia null.
alter table kaha_alunos alter column meta_semanal drop not null;
