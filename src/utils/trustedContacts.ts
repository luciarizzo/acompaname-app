export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

export function phoneLink(phone: string) {
  return phone.replace(/[^+\d]/g, '');
}
