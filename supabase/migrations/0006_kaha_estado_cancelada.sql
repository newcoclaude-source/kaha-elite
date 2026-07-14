-- Kaha Elite — B4: adiciona o estado 'cancelada' ao enum das sessões.
-- Em migration própria: ALTER TYPE ADD VALUE precisa commitar antes de o valor
-- poder ser usado (ex.: no índice parcial da 0007).
alter type kaha_sessao_estado add value if not exists 'cancelada';
