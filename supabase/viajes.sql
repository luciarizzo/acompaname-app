-- Pedir un viaje: direcciones guardadas y nuevo tipo de gestión
-- Ejecutar una sola vez en Supabase: SQL Editor > pegar > Run

-- Las direcciones guardadas del usuario se guardan dentro de su perfil, como una lista.
alter table public.perfiles add column if not exists direcciones jsonb not null default '[]'::jsonb;

-- La tabla gestiones acepta el tipo 'trip' (viaje).
alter table public.gestiones drop constraint if exists gestiones_tipo_check;
alter table public.gestiones add constraint gestiones_tipo_check check (tipo in ('event', 'cinema', 'appointment', 'trip', 'other'));
