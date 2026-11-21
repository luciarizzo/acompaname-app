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

// Crear cuenta con mail y contraseña.
// Si Supabase pide confirmar el mail, no hay sesión todavía: se avisa que revise su correo.
export async function signUp(email: string, password: string): Promise<{ error?: string; needsConfirmation?: boolean }> {
  if (!supabase) return { error: 'Las cuentas todavía no están configuradas en esta versión. Podés seguir sin cuenta.' };
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      if (error.code === 'user_already_exists' || error.code === 'email_exists') return { error: 'Ya existe una cuenta con ese mail. Probá con «Ya tengo cuenta».' };
      if (error.code === 'weak_password') return { error: 'La contraseña es muy corta o muy fácil. Usá al menos 6 letras o números.' };
      if (error.code === 'email_address_invalid' || error.code === 'validation_failed') return { error: 'Revisá que el mail esté bien escrito.' };
      if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') return { error: 'Hubo muchos intentos seguidos. Esperá unos minutos y volvé a probar.' };
      if (error.code === 'signup_disabled') return { error: 'Por ahora no se pueden crear cuentas nuevas.' };
      return { error: 'No pudimos crear la cuenta en este momento. Volvé a intentarlo en unos minutos.' };
    }
    // Con la confirmación por mail activa, un mail ya registrado vuelve sin identidades.
    if (data.user && data.user.identities?.length === 0) return { error: 'Ya existe una cuenta con ese mail. Probá con «Ya tengo cuenta».' };
    return data.session ? {} : { needsConfirmation: true };
  } catch {
    return { error: 'No pudimos conectarnos. Revisá tu conexión a internet y volvé a intentarlo.' };
  }
}

// Entrar con Google: lleva a la pantalla de Google y vuelve a la app con la sesión iniciada.
export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Las cuentas todavía no están configuradas en esta versión. Podés seguir sin cuenta.' };
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    });
    return error ? { error: 'No pudimos abrir Google en este momento. Probá de nuevo o entrá con tu mail.' } : {};
  } catch {
    return { error: 'No pudimos conectarnos. Revisá tu conexión a internet y volvé a intentarlo.' };
  }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}
