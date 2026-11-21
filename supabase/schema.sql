-- Esquema de la base de datos de Acompáñame
-- Se ejecuta una sola vez en Supabase: SQL Editor > pegar > Run

-- 1. PERFILES
-- Un perfil por usuario. El id es el mismo que el del usuario en el login de Supabase (auth.users).
create table public.perfiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  rol                     text not null default 'self' check (rol in ('self', 'supporting')),
  nombre                  text not null default '',
  ciudad                  text not null default 'Mendoza',
  accesibilidad           text not null default '' check (accesibilidad in ('older-adult', 'disability', 'both', 'prefer-not-to-say', '')),
  texto_grande            boolean not null default false,
  alto_contraste          boolean not null default false,
  leer_pantallas          boolean not null default false,
  medio_pago_preferido    text not null default '' check (medio_pago_preferido in ('debit-card', 'credit-card', '')),
  contactos_configurados  boolean not null default false,
  direcciones             jsonb not null default '[]'::jsonb,
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now()
);

-- 2. CONTACTOS DE CONFIANZA
-- Cada usuario puede tener como máximo dos contactos (orden 1 y orden 2).
create table public.contactos_confianza (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  orden       smallint not null check (orden in (1, 2)),
  nombre      text not null check (length(trim(nombre)) > 0),
  telefono    text not null check (length(regexp_replace(telefono, '\D', '', 'g')) >= 7),
  unique (usuario_id, orden)
);

-- 3. GESTIONES
-- Lo que aparece en "Mis gestiones": cada turno, salida o consulta que el usuario guardó.
create table public.gestiones (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.perfiles (id) on delete cascade,
  tipo         text not null check (tipo in ('event', 'cinema', 'appointment', 'trip', 'other')),
  titulo       text not null,
  descripcion  text not null default '',
  modo         text not null default 'demo' check (modo in ('demo', 'real')),
  opciones_edicion jsonb, -- alternativas que se mostraron al guardar un turno
  creado_en    timestamptz not null default now()
);

-- Índice para listar rápido las gestiones de un usuario, de la más nueva a la más vieja
create index gestiones_usuario_fecha_idx on public.gestiones (usuario_id, creado_en desc);

-- 4. SEGURIDAD
-- Se activa RLS en las tres tablas. Sin políticas, nadie puede leerlas desde afuera:
-- solo el back de la app, que usa la clave secreta (service_role).
alter table public.perfiles            enable row level security;
alter table public.contactos_confianza enable row level security;
alter table public.gestiones           enable row level security;

-- 5. PERMISOS
-- Solo el back (service_role) puede acceder a las tablas. Ver también supabase/permisos.sql.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.perfiles, public.contactos_confianza, public.gestiones to service_role;

-- 6. SUGERENCIAS VOLUNTARIAS DE FUNCIONALIDADES
-- La función del servidor verifica la sesión, limita envíos y rechaza correos y teléfonos.
create table public.sugerencias_funcionalidades (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(trim(texto)) between 10 and 280),
  creado_en timestamptz not null default now()
);
create index sugerencias_usuario_fecha_idx on public.sugerencias_funcionalidades (usuario_id, creado_en desc);
alter table public.sugerencias_funcionalidades enable row level security;
grant select, insert on public.sugerencias_funcionalidades to service_role;

-- 7. TURNOS MÉDICOS
-- Las tablas de turnos, el generador de horarios y los datos de prueba están en
-- supabase/migrations/20261118_turnos_medicos.sql. Ejecutalo después de este archivo.
