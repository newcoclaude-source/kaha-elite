-- 0019_kaha_usuarios.sql — captura da EQUIPE no onboarding (passo 4 do wizard).
-- É DADO, não controle de acesso: NÃO cria auth.users, não usa service role, não
-- amarra perfil a permissão. O app segue operando pelo login único do gestor;
-- `convidado` só marca quem receberá acesso individual numa fase posterior.
-- RLS authenticated-only = baseline do repo (sem isso, nome/email da equipe
-- ficariam legíveis pelo anon). Aditiva.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'kaha_usuario_perfil') then
    create type kaha_usuario_perfil as enum ('gerente','coordenador','professor');
  end if;
end $$;

create table if not exists kaha_usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  perfil kaha_usuario_perfil not null default 'professor',
  convidado boolean not null default false,
  seed boolean not null default false, -- consistência com limpar-seed.sql
  created_at timestamptz default now()
);

alter table kaha_usuarios enable row level security;
drop policy if exists kaha_usuarios_authenticated_all on kaha_usuarios;
create policy kaha_usuarios_authenticated_all on kaha_usuarios
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
