export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

export function phoneLink(phone: string) {
  return phone.replace(/[^+\d]/g, '');
}

// Validación compartida por el formulario de contactos posterior al onboarding.
export function trustedContactError(name: string, phone: string): string | null {
  if (!name.trim()) return 'Ingresá el nombre de la persona de confianza.';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Revisá el teléfono: debe tener entre 7 y 15 dígitos.';
  return null;
}
