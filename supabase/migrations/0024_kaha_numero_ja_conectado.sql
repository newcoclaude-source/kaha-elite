-- Kaha Elite — Fase 2.5 (fecho do onboarding): triagem do número de WhatsApp.
-- Guarda a resposta "seu número já foi usado em outra ferramenta de mensagens
-- antes?" (sim/não), coletada no passo "Conectar WhatsApp". Sinal importante de
-- risco na ativação (número já usado antes pode ter restrição). Não conecta nada.
--
-- Aditiva e idempotente. Só tabela kaha_*. null = ainda não respondeu.

alter table kaha_config
  add column if not exists numero_ja_conectado boolean;
