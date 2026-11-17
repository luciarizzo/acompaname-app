// Longitud y datos personales se verifican también en el servidor.
export const SUGGESTION_MIN_LENGTH = 10;
export const SUGGESTION_MAX_LENGTH = 280;

export function suggestionError(text: string): string | null {
  const value = text.trim();
  if (value.length < SUGGESTION_MIN_LENGTH) return 'Contanos un poquito más sobre la función que te gustaría.';
  if (value.length > SUGGESTION_MAX_LENGTH) return 'La sugerencia es demasiado larga. Podés resumirla un poco.';
  if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(value) || /(?:\+?\d[\d\s()-]{7,}\d)/.test(value)) {
    return 'No incluyas correos electrónicos, teléfonos ni otros datos personales.';
  }
  return null;
}

// Si el usuario canceló el login, recupera lo que escribió antes de salir de «Otra cosa».
export const SUGGESTION_DRAFT_KEY = 'acompaname-other-suggestion-draft';
export function initialFeatureSuggestion(prompt: string, loadDraft = () => sessionStorage.getItem(SUGGESTION_DRAFT_KEY)): string {
  try { return loadDraft() || prompt; }
  catch { return prompt; }
}
