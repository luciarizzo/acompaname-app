import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Funciones de cuenta: iniciar sesión, cerrar sesión y consultar la sesión actual.
// Devuelven mensajes en castellano para mostrarlos tal cual en pantalla.

export const accountsAvailable = supabase !== null;

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Las cuentas todavía no están configuradas en esta versión. Podés seguir sin cuenta.' };
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return {};
    if (error.code === 'invalid_credentials') return { error: 'El mail o la contraseña no son correctos. Revisalos y volvé a intentarlo.' };
    if (error.code === 'email_not_confirmed') return { error: 'Todavía falta confirmar tu mail.' };
    return { error: 'No pudimos iniciar sesión en este momento. Volvé a intentarlo en unos minutos.' };
  } catch {
    return { error: 'No pudimos conectarnos. Revisá tu conexión a internet y volvé a intentarlo.' };
  }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}
