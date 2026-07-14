-- Kaha Elite — hardening: fixa o search_path das funções kaha_* (advisor
-- function_search_path_mutable). Evita injeção via search_path. Não muda o corpo.
alter function kaha_salvar_ficha(uuid, text, text, jsonb) set search_path = public;
alter function kaha_registrar_carga(uuid, uuid, int, int, numeric) set search_path = public;
