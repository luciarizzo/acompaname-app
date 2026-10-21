import type { TrustedContact } from './trustedContacts';

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
}

const PROFILE_KEY = 'acompaname-v1-profile';

export const defaultProfile: OnboardingProfile = {
  role: 'self',
  name: '',
  city: 'Mendoza',
  accessibility: '',
  largerText: false,
  highContrast: false,
  readScreens: false,
  preferredPaymentMethod: '',
  trustedContacts: [],
  trustedContactsSetup: false,
};

export function getOnboardingProfile(): OnboardingProfile {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    const profile = saved ? { ...defaultProfile, ...JSON.parse(saved) as Partial<OnboardingProfile> } : defaultProfile;
    const contacts = Array.isArray(profile.trustedContacts) ? profile.trustedContacts.filter(contact =>
      contact && typeof contact.id === 'string' && typeof contact.name === 'string' && typeof contact.phone === 'string' &&
      contact.name.trim().length > 0 && contact.phone.replace(/\D/g, '').length >= 7
    ).slice(0, 2) : [];
    const preferredPaymentMethod: PaymentMethod = profile.preferredPaymentMethod === 'debit-card' || profile.preferredPaymentMethod === 'credit-card' ? profile.preferredPaymentMethod : '';
    return { ...profile, preferredPaymentMethod, trustedContacts: contacts, trustedContactsSetup: Boolean(profile.trustedContactsSetup) };
  } catch {
    return defaultProfile;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* Continue without persistence when storage is unavailable. */ }
}
