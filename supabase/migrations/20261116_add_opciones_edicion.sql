-- Ejecutar una vez en Supabase antes de desplegar la revisión de HU18.
alter table public.gestiones add column if not exists opciones_edicion jsonb;
