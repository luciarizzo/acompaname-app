export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

const CONTACTS_KEY = 'acompaname-v1-trusted-contacts';

export function getTrustedContacts(): TrustedContact[] {
  try {
    const saved = localStorage.getItem(CONTACTS_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((item): item is TrustedContact =>
      typeof item === 'object' && item !== null &&
      typeof (item as TrustedContact).id === 'string' &&
      typeof (item as TrustedContact).name === 'string' &&
      typeof (item as TrustedContact).phone === 'string'
    ) : [];
  } catch {
    return [];
  }
}

export function saveTrustedContacts(contacts: TrustedContact[]) {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
    return true;
  } catch {
    return false;
  }
}

export function phoneLink(phone: string) {
  return phone.replace(/[^+\d]/g, '');
}
