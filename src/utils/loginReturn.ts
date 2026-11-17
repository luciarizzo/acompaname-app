// La pantalla de login se reutiliza desde el inicio y desde «Otra cosa».
// Recordar el origen evita enviar siempre al usuario a la pantalla de entrada.
export type LoginOrigin = 'entry' | 'suggestion' | 'home';

export function returnFromLogin(origin: LoginOrigin) {
  if (origin === 'suggestion') return { view: 'home' as const, flow: 'other' as const };
  if (origin === 'home') return { view: 'home' as const, flow: null };
  return { view: 'entry' as const, flow: null };
}

// Solo se retoma la sugerencia si el perfil de la cuenta ya está configurado.
// En caso contrario se respeta el onboarding que requiere la app.
export function shouldResumeSuggestion(origin: LoginOrigin, configured: boolean): boolean {
  return origin === 'suggestion' && configured;
}
