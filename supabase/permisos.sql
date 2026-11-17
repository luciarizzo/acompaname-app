-- Permisos para el back de Acompáñame
-- Al crear el proyecto se desactivó "Automatically expose new tables", así que las tablas nuevas no tienen permisos.
-- Esto le da acceso solo al rol service_role, que es el que usan las funciones del back con la clave secreta.
-- El navegador (roles anon y authenticated) sigue sin poder leer ni escribir las tablas.

grant usage on schema public to service_role;
grant select, insert, update, delete on public.perfiles, public.contactos_confianza, public.gestiones to service_role;
