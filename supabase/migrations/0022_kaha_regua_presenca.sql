-- 0022_kaha_regua_presenca.sql — passo 3.5: régua de presença + hora de confirmação.
-- Aditivas.
--   dias_resgate: a fila de resgate vai atrás do aluno após N dias sem treinar
--     (o motor lê este valor em vez do comportamento fixo por semana).
--   hora_confirmacao: horário em que a Julia confirma as sessões do dia. Fase
--     COPILOTO não tem job automático — o valor fica capturado para a Fase 2.
alter table kaha_config
  add column if not exists dias_resgate int not null default 10 check (dias_resgate > 0);
alter table kaha_config
  add column if not exists hora_confirmacao time not null default '07:00';
