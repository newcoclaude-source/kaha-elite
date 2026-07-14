-- Kaha Elite — B2: grade de horários dos professores + especialidade.
-- kaha_horarios é a fonte dos "horários livres" que o board (B4) e a Julia (B6)
-- vão consumir. RLS: apenas authenticated (mesma convenção de 0001; sem USING(true)).

-- ────────────────────────────────────────────────────────────────────────────
-- Professores: campo especialidade (usado nos cards e no form do B2)
-- ────────────────────────────────────────────────────────────────────────────
alter table kaha_professores add column if not exists especialidade text;

-- ────────────────────────────────────────────────────────────────────────────
-- Grade de horários: um registro por (professor, dia_semana, hora) atendido.
-- dia_semana 0=domingo (padrão Postgres/JS). unique garante toggle idempotente.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists kaha_horarios (
  id            uuid primary key default gen_random_uuid(),
  professor_id  uuid not null references kaha_professores(id) on delete cascade,
  dia_semana    int  not null check (dia_semana between 0 and 6), -- 0=domingo
  hora          time not null,
  created_at    timestamptz not null default now(),
  unique (professor_id, dia_semana, hora)
);
create index if not exists kaha_horarios_professor_idx on kaha_horarios(professor_id);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — habilitar e policy mínima (authenticated), igual às demais tabelas.
-- ────────────────────────────────────────────────────────────────────────────
alter table kaha_horarios enable row level security;

drop policy if exists kaha_horarios_authenticated_all on kaha_horarios;
create policy kaha_horarios_authenticated_all on kaha_horarios
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
