import type { TrustedContact } from './trustedContacts';
import type { SavedAddress } from './addresses';
import { storageKey } from './storageMode';
import { pushProfile, PROFILE_KEY as BASE_PROFILE_KEY } from '../services/accountData';

export type PaymentMethod = 'debit-card' | 'credit-card' | '';

export interface OnboardingProfile {
  role: 'self' | 'supporting';
  name: string;
  city: string;
  accessibility: 'older-adult' | 'disability' | 'both' | 'prefer-not-to-say' | '';
  largerText: boolean;
  highContrast: boolean;
  readScreens: boolean;
  preferredPaymentMethod: PaymentMethod;
  trustedContacts: TrustedContact[];
  trustedContactsSetup: boolean;
  savedAddresses: SavedAddress[];
}

// Invitado: guarda en localStorage como siempre. Con cuenta: guarda en la copia local y además envía el perfil a la base.
const profileKey = () => storageKey(BASE_PROFILE_KEY);

export const defaultProfile: OnboardingProfile = {
  role: 'self',
  name: '',
  city: '',
  accessibility: '',
  largerText: false,
  highContrast: false,
  readScreens: false,
  preferredPaymentMethod: '',
  trustedContacts: [],
  trustedContactsSetup: false,
  savedAddresses: [],
};

export function getOnboardingProfile(): OnboardingProfile {
  try {
    const saved = localStorage.getItem(profileKey());
    const profile = saved ? { ...defaultProfile, ...JSON.parse(saved) as Partial<OnboardingProfile> } : defaultProfile;
    const contacts = Array.isArray(profile.trustedContacts) ? profile.trustedContacts.filter(contact =>
      contact && typeof contact.id === 'string' && typeof contact.name === 'string' && typeof contact.phone === 'string' &&
      contact.name.trim().length > 0 && contact.phone.replace(/\D/g, '').length >= 7
    ).slice(0, 2) : [];
    const preferredPaymentMethod: PaymentMethod = profile.preferredPaymentMethod === 'debit-card' || profile.preferredPaymentMethod === 'credit-card' ? profile.preferredPaymentMethod : '';
    const savedAddresses = Array.isArray(profile.savedAddresses) ? profile.savedAddresses.filter(item =>
      item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.address === 'string' && item.address.trim().length > 0
    ) : [];
    return { ...profile, preferredPaymentMethod, trustedContacts: contacts, trustedContactsSetup: Boolean(profile.trustedContactsSetup), savedAddresses };
  } catch {
    return defaultProfile;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile) {
  try { localStorage.setItem(profileKey(), JSON.stringify(profile)); } catch { /* Continue without persistence when storage is unavailable. */ }
  pushProfile(profile);
}
