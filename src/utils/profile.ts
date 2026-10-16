export interface OnboardingProfile {
  role: 'self' | 'supporting';
  name: string;
  accessibility: 'older-adult' | 'disability' | 'both' | 'prefer-not-to-say' | '';
  largerText: boolean;
  highContrast: boolean;
  readScreens: boolean;
}

const PROFILE_KEY = 'acompaname-v1-profile';

export const defaultProfile: OnboardingProfile = {
  role: 'self',
  name: '',
  accessibility: '',
  largerText: false,
  highContrast: false,
  readScreens: false,
};

export function getOnboardingProfile(): OnboardingProfile {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? { ...defaultProfile, ...JSON.parse(saved) as Partial<OnboardingProfile> } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* Continue without persistence when storage is unavailable. */ }
}
