// Indica si la app está guardando como invitado o con una cuenta.
// Invitado: usa las mismas claves de localStorage de siempre.
// Con cuenta: usa claves aparte, que funcionan como copia local de lo que está en la base.
// Así los datos del invitado y los de la cuenta nunca se mezclan en el mismo dispositivo.

let accountId: string | null = null;

export function setAccountMode(id: string | null) { accountId = id; }
export function isAccountMode() { return accountId !== null; }
export function storageKey(base: string) { return accountId ? `${base}-cuenta` : base; }

/** Identificador de la cuenta actual para aislar borradores entre usuarios. */
export function currentAccountId() { return accountId; }
