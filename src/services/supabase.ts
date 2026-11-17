import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase para el front. Usa solo la URL y la clave publishable, que pueden ser públicas.
// Si alguien levanta el proyecto sin el archivo .env, el cliente queda en null y la app funciona solo como invitado.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
