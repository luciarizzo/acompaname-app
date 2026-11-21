-- Turnos médicos propios de Acompáñame (API de turnos).
-- Ejecutar una sola vez en Supabase: SQL Editor > pegar todo el archivo > Run.
-- Se puede volver a ejecutar sin duplicar datos.
--
-- Modelo (inspirado en los recursos Schedule / Slot / Appointment del estándar de salud FHIR):
--   turnos_centros        -> sedes o consultorios
--   turnos_profesionales  -> un profesional por especialidad y sede
--   turnos_horarios       -> cada horario de atención. Libre cuando usuario_id es null; reservado cuando tiene usuario y código.
--
-- Los centros y profesionales cargados acá son DE PRUEBA: no son prestadores reales.
-- Por privacidad no se guarda el motivo de consulta, diagnósticos ni obra social: solo quién reservó qué horario.

-- 1. TABLAS
create table if not exists public.turnos_centros (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  direccion  text not null,
  ciudad     text not null,
  unique (nombre, ciudad)
);

create table if not exists public.turnos_profesionales (
  id            uuid primary key default gen_random_uuid(),
  centro_id     uuid not null references public.turnos_centros (id) on delete cascade,
  nombre        text not null,
  especialidad  text not null check (especialidad in ('Clínica médica', 'Cardiología', 'Oftalmología', 'Odontología')),
  unique (centro_id, especialidad)
);

create table if not exists public.turnos_horarios (
  id              uuid primary key default gen_random_uuid(),
  profesional_id  uuid not null references public.turnos_profesionales (id) on delete cascade,
  inicio          timestamptz not null,
  usuario_id      uuid references auth.users (id) on delete set null,
  codigo          text unique,
  reservado_en    timestamptz,
  -- Un profesional no puede tener dos horarios a la misma hora.
  unique (profesional_id, inicio),
  -- Un horario reservado siempre tiene usuario y código; uno libre no tiene ninguno de los dos.
  check ((usuario_id is null) = (codigo is null))
);

-- Búsqueda rápida de horarios libres y de los turnos de cada usuario.
create index if not exists turnos_horarios_libres_idx on public.turnos_horarios (profesional_id, inicio) where usuario_id is null;
create index if not exists turnos_horarios_usuario_idx on public.turnos_horarios (usuario_id, inicio) where usuario_id is not null;

-- La gestión de "Mis gestiones" queda vinculada al turno reservado.
alter table public.gestiones add column if not exists turno_id uuid references public.turnos_horarios (id) on delete set null;

-- 2. SEGURIDAD: igual que el resto del esquema, solo el back (service_role) accede a las tablas.
alter table public.turnos_centros       enable row level security;
alter table public.turnos_profesionales enable row level security;
alter table public.turnos_horarios      enable row level security;
grant select, insert, update, delete on public.turnos_centros, public.turnos_profesionales, public.turnos_horarios to service_role;

-- 3. GENERADOR DE HORARIOS
-- Crea horarios de lunes a viernes para los próximos días (hora de Argentina). No duplica los existentes.
-- La API lo llama sola cuando quedan pocos horarios libres; también se puede ejecutar a mano:
--   select public.generar_horarios_turnos(21);
create or replace function public.generar_horarios_turnos(dias integer default 21)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  insertados integer;
begin
  dias := least(greatest(coalesce(dias, 21), 1), 60);
  insert into public.turnos_horarios (profesional_id, inicio)
  select p.id, (d::date + h::time) at time zone 'America/Argentina/Buenos_Aires'
  from public.turnos_profesionales p
  cross join generate_series(current_date + 1, current_date + dias, interval '1 day') as d
  cross join unnest(array['09:00', '10:30', '12:00', '15:00', '16:30']) as h
  where extract(isodow from d) < 6
  on conflict (profesional_id, inicio) do nothing;
  get diagnostics insertados = row_count;
  return insertados;
end;
$$;
revoke all on function public.generar_horarios_turnos(integer) from public, anon, authenticated;
grant execute on function public.generar_horarios_turnos(integer) to service_role;

-- 4. DATOS DE PRUEBA
insert into public.turnos_centros (nombre, direccion, ciudad) values
  ('Centro Médico Acompáñame', 'Av. España 1340', 'Mendoza'),
  ('Centro Médico Acompáñame', 'Av. Corrientes 2450', 'Buenos Aires'),
  ('Centro Médico Acompáñame', 'Bv. San Juan 780', 'Córdoba'),
  ('Centro Médico Acompáñame', 'Bv. Oroño 1150', 'Rosario'),
  ('Centro Médico Acompáñame', 'Calle 7 N.º 1020', 'La Plata')
on conflict (nombre, ciudad) do nothing;

insert into public.turnos_profesionales (centro_id, nombre, especialidad)
select c.id, p.nombre, p.especialidad
from public.turnos_centros c
join (values
  ('Mendoza',      'Dra. Paula Ríos',      'Clínica médica'),
  ('Mendoza',      'Dr. Martín López',     'Cardiología'),
  ('Mendoza',      'Dra. Laura Acosta',    'Oftalmología'),
  ('Mendoza',      'Dr. Andrés Molina',    'Odontología'),
  ('Buenos Aires', 'Dra. Sofía Benítez',   'Clínica médica'),
  ('Buenos Aires', 'Dr. Ricardo Paz',      'Cardiología'),
  ('Buenos Aires', 'Dra. Inés Gutiérrez',  'Oftalmología'),
  ('Buenos Aires', 'Dr. Tomás Ferreyra',   'Odontología'),
  ('Córdoba',      'Dra. Carla Medina',    'Clínica médica'),
  ('Córdoba',      'Dr. Julián Sosa',      'Cardiología'),
  ('Córdoba',      'Dra. Valeria Ortiz',   'Oftalmología'),
  ('Córdoba',      'Dr. Pablo Herrera',    'Odontología'),
  ('Rosario',      'Dra. Lucía Romero',    'Clínica médica'),
  ('Rosario',      'Dr. Diego Castro',     'Cardiología'),
  ('Rosario',      'Dra. Marta Giménez',   'Oftalmología'),
  ('Rosario',      'Dr. Federico Vera',    'Odontología'),
  ('La Plata',     'Dra. Ana Domínguez',   'Clínica médica'),
  ('La Plata',     'Dr. Hernán Suárez',    'Cardiología'),
  ('La Plata',     'Dra. Gabriela Luna',   'Oftalmología'),
  ('La Plata',     'Dr. Nicolás Ibarra',   'Odontología')
) as p (ciudad, nombre, especialidad) on p.ciudad = c.ciudad
where c.nombre = 'Centro Médico Acompáñame'
on conflict (centro_id, especialidad) do nothing;

select public.generar_horarios_turnos(21);
