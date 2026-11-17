import { currentAccountId } from './storageMode';

type DraftKind = 'cinema' | 'appointment' | 'event' | 'trip';
interface SavedDraft<T> { version: 1; savedAt: number; payload: T }
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const draftKey = (kind: DraftKind) => {
  const accountId = currentAccountId();
  return accountId ? `acompaname-flow-draft-${kind}-cuenta-${accountId}` : `acompaname-flow-draft-${kind}`;
};

/** Solamente conservar decisiones de la pantalla: nunca claves, datos de pago ni reservas reales. */
export function loadFlowDraft<T>(kind: DraftKind): T | null {
  try {
    const raw = localStorage.getItem(draftKey(kind));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<SavedDraft<T>>;
    if (entry.version !== 1 || !entry.savedAt || !entry.payload || Date.now() - entry.savedAt > MAX_AGE_MS || entry.savedAt > Date.now()) {
      removeFlowDraft(kind);
      return null;
    }
    return entry.payload;
  } catch { return null; }
}
export function saveFlowDraft<T>(kind: DraftKind, payload: T): void {
  try { localStorage.setItem(draftKey(kind), JSON.stringify({ version: 1, savedAt: Date.now(), payload } satisfies SavedDraft<T>)); }
  catch { /* La aplicación continúa si el navegador no permite guardar datos. */ }
}
export function removeFlowDraft(kind: DraftKind): void {
  try { localStorage.removeItem(draftKey(kind)); } catch { /* Sin almacenamiento disponible. */ }
}
