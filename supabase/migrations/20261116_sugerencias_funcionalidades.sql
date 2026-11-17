-- Ejecutar en el SQL Editor de Supabase antes de desplegar HU20.
create table if not exists public.sugerencias_funcionalidades (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(trim(texto)) between 10 and 280),
  creado_en timestamptz not null default now()
);
create index if not exists sugerencias_usuario_fecha_idx
  on public.sugerencias_funcionalidades (usuario_id, creado_en desc);
alter table public.sugerencias_funcionalidades enable row level security;
grant select, insert on public.sugerencias_funcionalidades to service_role;
