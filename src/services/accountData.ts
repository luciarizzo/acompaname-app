import type { Session } from '@supabase/supabase-js';
import type { SavedTask } from '../types';
import type { OnboardingProfile } from '../utils/profile';
import { isAccountMode, setAccountMode, storageKey } from '../utils/storageMode';
import { supabase } from './supabase';

// Comunicación con las funciones del back (netlify/functions/perfil.mjs y gestiones.mjs).
// Cada pedido lleva la sesión del usuario para que el back sepa de quién son los datos.

export const TASKS_KEY = 'acompaname-v1-tasks';
export const PROFILE_KEY = 'acompaname-v1-profile';
const pendingTaskSaves = new Map<string, Promise<void>>();

async function request<T>(name: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No hay sesión iniciada.');
  const response = await fetch(`/.netlify/functions/${name}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No pudimos comunicarnos con el servidor.');
  return payload as T;
}

// Envía una gestión a la base. Si falla (por ejemplo, sin internet), la gestión igual queda en la copia local.
export function pushTask(task: SavedTask) {
  if (!isAccountMode() || !supabase) return;
  const pending = request('gestiones', 'POST', task)
    .then(() => undefined)
    .catch(error => console.warn('No se pudo guardar la gestión en la base', error))
    .finally(() => { if (pendingTaskSaves.get(task.id) === pending) pendingTaskSaves.delete(task.id); });
  pendingTaskSaves.set(task.id, pending);
}

// Edición de una referencia guardada: el servidor modifica únicamente título y descripción
// y comprueba que la gestión pertenezca a la cuenta autenticada.
export async function updateTaskOnAccount(task: SavedTask): Promise<void> {
  if (!isAccountMode()) return;
  if (!supabase) throw new Error('No se puede acceder a la cuenta en este momento.');
  await pendingTaskSaves.get(task.id);
  await request('gestiones', 'PUT', task);
}

export async function deleteTaskOnAccount(id: string): Promise<void> {
  if (!isAccountMode()) return;
  if (!supabase) throw new Error('No se puede acceder a la cuenta en este momento.');
  await pendingTaskSaves.get(id);
  await request('gestiones', 'DELETE', { id });
}

// Envía el perfil completo a la base. Si falla, el perfil igual queda en la copia local.
export function pushProfile(profile: OnboardingProfile) {
  if (!isAccountMode() || !supabase) return;
  request('perfil', 'PUT', profile).catch(error => console.warn('No se pudo guardar el perfil en la base', error));
}

// Se llama al iniciar sesión (o al abrir la app con la sesión ya iniciada).
// Pasa a modo cuenta, trae el perfil y las gestiones de la base y los copia al localStorage de la cuenta.
// Devuelve si el usuario ya tiene su configuración guardada, para decidir si va al Inicio o a la Bienvenida.
export async function activateAccount(session: Session): Promise<{ configured: boolean }> {
  setAccountMode(session.user.id);
  try {
    const [{ profile }, { tasks }] = await Promise.all([
      request<{ profile: OnboardingProfile | null }>('perfil', 'GET'),
      request<{ tasks: SavedTask[] }>('gestiones', 'GET'),
    ]);
    if (profile) localStorage.setItem(storageKey(PROFILE_KEY), JSON.stringify(profile));
    else localStorage.removeItem(storageKey(PROFILE_KEY));
    localStorage.setItem(storageKey(TASKS_KEY), JSON.stringify(tasks));
    return { configured: Boolean(profile?.trustedContactsSetup) };
  } catch (error) {
    // Sin conexión con el back: se sigue con la copia local que haya quedado de la última vez.
    console.warn('No se pudieron traer los datos de la cuenta', error);
    try {
      const cached = JSON.parse(localStorage.getItem(storageKey(PROFILE_KEY)) || 'null') as OnboardingProfile | null;
      return { configured: Boolean(cached?.trustedContactsSetup) };
    } catch { return { configured: false }; }
  }
}

// Se llama al cerrar sesión: borra la copia local de la cuenta y vuelve a los datos del invitado.
export function deactivateAccount() {
  if (isAccountMode()) {
    localStorage.removeItem(storageKey(PROFILE_KEY));
    localStorage.removeItem(storageKey(TASKS_KEY));
  }
  setAccountMode(null);
}

// Las sugerencias son voluntarias y solo las guarda una cuenta autenticada.
export async function sendFeatureSuggestion(text: string): Promise<void> {
  if (!isAccountMode() || !supabase) throw new Error('Para enviar la sugerencia necesitás iniciar sesión.');
  await request('sugerencias', 'POST', { text: text.trim() });
}
