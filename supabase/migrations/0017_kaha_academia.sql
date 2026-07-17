-- 0017_kaha_academia.sql — campos da Academia (passo 1 do wizard). Aditivo.
alter table kaha_config add column if not exists academia_nome text;
alter table kaha_config add column if not exists academia_horarios text;
