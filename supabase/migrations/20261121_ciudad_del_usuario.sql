-- Turnos y viajes se adaptan a la ciudad que la persona eligió en su perfil.
-- Ejecutar una vez en Supabase: SQL Editor > pegar > Run. Se puede volver a ejecutar.

-- 1. PERFIL: provincia y centro de la ciudad (de la lista oficial de localidades).
alter table public.perfiles add column if not exists provincia text not null default '';
alter table public.perfiles add column if not exists ciudad_lat double precision;
alter table public.perfiles add column if not exists ciudad_lon double precision;
alter table public.perfiles alter column ciudad set default '';

-- 2. SEDES DE TURNOS: se identifican por ciudad y provincia (hay ciudades con el mismo nombre en distintas provincias).
alter table public.turnos_centros add column if not exists provincia text not null default '';
update public.turnos_centros set ciudad = 'Ciudad de Buenos Aires' where ciudad = 'Buenos Aires' and provincia = '';
update public.turnos_centros set provincia = case ciudad
  when 'Mendoza' then 'Mendoza'
  when 'Ciudad de Buenos Aires' then 'Ciudad Autónoma de Buenos Aires'
  when 'Córdoba' then 'Córdoba'
  when 'Rosario' then 'Santa Fe'
  when 'La Plata' then 'Buenos Aires'
  else provincia end
where provincia = '';
alter table public.turnos_centros drop constraint if exists turnos_centros_nombre_ciudad_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'turnos_centros_nombre_ciudad_provincia_key') then
    alter table public.turnos_centros add constraint turnos_centros_nombre_ciudad_provincia_key unique (nombre, ciudad, provincia);
  end if;
end $$;
