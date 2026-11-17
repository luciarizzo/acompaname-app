import { useBrowserBack } from '../utils/useBrowserBack';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, SlidersHorizontal } from 'lucide-react';
import { type OnboardingProfile } from '../utils/profile';
import { LocalityAutocomplete } from '../components/LocalityAutocomplete';

interface Props {
  profile: OnboardingProfile;
  onSave: (profile: OnboardingProfile) => void;
  onCancel: () => void;
  onPreferencesPreview: (preferences: Pick<OnboardingProfile, 'largerText' | 'highContrast'>) => void;
}

/** La edición no reinicia el onboarding ni modifica contactos ni gestiones. */
export function ProfileSettingsPage({ profile, onSave, onCancel, onPreferencesPreview }: Props) {
  useBrowserBack(onCancel);
  const [draft, setDraft] = useState<OnboardingProfile>(profile);
  const [error, setError] = useState('');
  useEffect(() => { setDraft(profile); }, [profile]);
  const change = (next: Partial<OnboardingProfile>) => {
    const updated = { ...draft, ...next };
    setDraft(updated);
    if ('largerText' in next || 'highContrast' in next) {
      onPreferencesPreview({ largerText: updated.largerText, highContrast: updated.highContrast });
    }
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.city.trim()) { setError('Ingresá una ciudad para guardar la configuración.'); return; }
    onSave({ ...draft, name: draft.name.trim(), city: draft.city.trim() });
  };
  return <main id="main" className="page profile-settings-page">
    <div className="flow-top"><button type="button" className="back-button" onClick={onCancel}><ArrowLeft size={20}/> Volver al inicio</button></div>
    <div className="flow-heading"><p className="eyebrow">TUS PREFERENCIAS</p><h1>Mi configuración</h1><p>Podés cambiar tus datos sin empezar de nuevo. Los contactos se modifican desde «Llamar a alguien».</p></div>
    <form className="form-card" onSubmit={save} noValidate>
      <div className="profile-settings-heading"><SlidersHorizontal aria-hidden="true" size={22}/><h2>Datos y accesibilidad</h2></div>
      <label className="field-label" htmlFor="settings-name">Nombre que querés usar</label>
      <input id="settings-name" className="form-control" maxLength={40} value={draft.name} onChange={event => change({ name: event.target.value })}/>
      <label className="field-label" htmlFor="settings-city">Ciudad</label>
      <LocalityAutocomplete id="settings-city" value={draft.city} onChange={city => {change({ city });setError('');}} required/>
      <label className="field-label" htmlFor="settings-role">¿Quién usa Acompáñame?</label>
      <select id="settings-role" className="form-control" value={draft.role} onChange={event => change({ role: event.target.value as OnboardingProfile['role'] })}>
        <option value="self">La voy a usar yo</option><option value="supporting">Estoy ayudando a otra persona</option>
      </select>
      <label className="field-label" htmlFor="settings-accessibility">Preferencias personales (opcional)</label>
      <select id="settings-accessibility" className="form-control" value={draft.accessibility} onChange={event => change({ accessibility: event.target.value as OnboardingProfile['accessibility'] })}>
        <option value="">Sin indicar</option><option value="older-adult">Persona mayor</option><option value="disability">Persona con discapacidad</option><option value="both">Ambas opciones</option><option value="prefer-not-to-say">Prefiero no decirlo</option>
      </select>
      <fieldset className="settings-options"><legend>Preferencias de uso</legend>
        <label className="settings-option"><input type="checkbox" checked={draft.largerText} onChange={event => change({ largerText: event.target.checked })}/><span>Texto más grande</span></label>
        <label className="settings-option"><input type="checkbox" checked={draft.highContrast} onChange={event => change({ highContrast: event.target.checked })}/><span>Contraste alto</span></label>
        <label className="settings-option"><input type="checkbox" checked={draft.readScreens} onChange={event => change({ readScreens: event.target.checked })}/><span>Leer instrucciones en voz alta</span></label>
      </fieldset>
      <label className="field-label" htmlFor="settings-payment">Medio de pago preferido</label>
      <select id="settings-payment" className="form-control" value={draft.preferredPaymentMethod} onChange={event => change({ preferredPaymentMethod: event.target.value as OnboardingProfile['preferredPaymentMethod'] })}>
        <option value="">Elegir más adelante</option><option value="debit-card">Tarjeta de débito</option><option value="credit-card">Tarjeta de crédito</option>
      </select>
      <p className="onboarding-privacy">Solo guardamos tu preferencia. No pedimos datos de la tarjeta ni hacemos pagos.</p>
      {error && <p className="trusted-error" role="alert">{error}</p>}
      <div className="saved-form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button"><Check size={19}/> Guardar cambios</button></div>
    </form>
  </main>;
}
