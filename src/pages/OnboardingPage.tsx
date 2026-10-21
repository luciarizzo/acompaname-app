import { ArrowLeft, ArrowRight, Check, CreditCard, Eye, Mic, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { OnboardingProfile } from '../utils/profile';

interface Props { onComplete: (profile: OnboardingProfile) => void; onCancel: () => void; onStepChange: () => void; onPreferencesPreview: (preferences: Pick<OnboardingProfile, 'largerText' | 'highContrast'>) => void; initialProfile: OnboardingProfile; initialStep?: number }
const steps = ['Quién la usa', 'Perfil', 'Preferencias', 'Medio de pago', 'Contactos de confianza', 'Revisar'];

export function OnboardingPage({ onComplete, onCancel, onStepChange, onPreferencesPreview, initialProfile, initialStep = 0 }: Props) {
  const [step, setStep] = useState(() => Math.min(Math.max(initialStep, 0), steps.length - 1));
  const [profile, setProfile] = useState<OnboardingProfile>(initialProfile);
  const [contactError, setContactError] = useState('');
  useEffect(() => { onStepChange(); }, [step]);
  const update = (changes: Partial<OnboardingProfile>) => setProfile((current) => {
    const next = { ...current, ...changes };
    if ('largerText' in changes || 'highContrast' in changes) onPreferencesPreview({ largerText: next.largerText, highContrast: next.highContrast });
    return next;
  });
  const updateContact = (index: number, changes: { name?: string; phone?: string }) => {
    const contacts = [...profile.trustedContacts];
    contacts[index] = { id: contacts[index]?.id || crypto.randomUUID(), name: changes.name ?? contacts[index]?.name ?? '', phone: changes.phone ?? contacts[index]?.phone ?? '' };
    update({ trustedContacts: contacts.slice(0, 2) });
    setContactError('');
  };
  const next = () => {
    if (step === 4) {
      const hasPartialContact = profile.trustedContacts.some(contact => Boolean(contact.name.trim()) !== Boolean(contact.phone.trim()));
      if (hasPartialContact) { setContactError('Para guardar un contacto, completá su nombre y su teléfono. También podés dejar los dos vacíos.'); return; }
      const hasInvalidPhone = profile.trustedContacts.some(contact => contact.name.trim() && contact.phone.replace(/\D/g, '').length < 7);
      if (hasInvalidPhone) { setContactError('Revisá el número: tiene que incluir al menos 7 dígitos.'); return; }
    }
    setContactError('');
    step < steps.length - 1 ? setStep((current) => current + 1) : onComplete(profile);
  };
  const back = () => step > 0 ? setStep((current) => current - 1) : onCancel();

  return <main id="main" className="page onboarding-page">
    <div className="onboarding-progress" aria-label={`Paso ${step + 1} de ${steps.length}`}>
      <button className="back-button" onClick={back}><ArrowLeft size={18}/> {step === 0 ? 'Volver a bienvenida' : 'Volver'}</button>
      <span>Paso {step + 1} de {steps.length}</span>
    </div>
    <div className="onboarding-progress-track" aria-hidden="true"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }}/></div>

    {step === 0 && <section className="onboarding-step" aria-labelledby="onboarding-title">
      <p className="eyebrow">CONFIGURACIÓN INICIAL</p><h1 id="onboarding-title">¿Quién va a usar Acompáñame?</h1>
      <p className="onboarding-lead">Así podemos preparar la aplicación para la persona que la va a usar.</p>
      <div className="onboarding-choices">
        <button className={`onboarding-choice ${profile.role === 'self' ? 'selected' : ''}`} aria-pressed={profile.role === 'self'} onClick={() => update({ role: 'self' })}><span aria-hidden="true">🙂</span><strong>La voy a usar yo</strong><small>Quiero resolver mis gestiones</small></button>
        <button className={`onboarding-choice ${profile.role === 'supporting' ? 'selected' : ''}`} aria-pressed={profile.role === 'supporting'} onClick={() => update({ role: 'supporting' })}><span aria-hidden="true">🤝</span><strong>Estoy ayudando a otra persona</strong><small>La configuramos para quien la va a usar</small></button>
      </div>
    </section>}

    {step === 1 && <section className="onboarding-step" aria-labelledby="onboarding-title">
      <p className="eyebrow">PARA PERSONALIZAR LA EXPERIENCIA</p><h1 id="onboarding-title">Conozcamos a quien va a usar la app</h1>
      <label className="field-label" htmlFor="profile-name">{profile.role === 'self' ? '¿Cómo querés que te llamemos?' : '¿Cómo se llama la persona que usará la app?'} <span className="optional-label">(opcional)</span></label>
      <input id="profile-name" className="form-control" value={profile.name} maxLength={40} placeholder="Solo el nombre" onChange={(event) => update({ name: event.target.value })}/>
      <label className="field-label" htmlFor="profile-city">¿En qué ciudad estás?</label>
      <input id="profile-city" className="form-control" value={profile.city} maxLength={60} placeholder="Por ejemplo: Mendoza" onChange={(event) => update({ city: event.target.value })}/>
      <p className="onboarding-privacy">Usamos tu ciudad para mostrar salidas y sedes cercanas. Podés corregirla antes de guardar.</p>
      <fieldset className="onboarding-fieldset"><legend>¿Qué opción te representa mejor? <span className="optional-label">(opcional)</span></legend>
        <div className="onboarding-choices compact">
          {([
            ['older-adult', 'Persona mayor'], ['disability', 'Persona con discapacidad'], ['both', 'Ambas opciones'], ['prefer-not-to-say', 'Prefiero no decirlo'],
          ] as const).map(([value, label]) => <button key={value} className={`onboarding-choice small ${profile.accessibility === value ? 'selected' : ''}`} aria-pressed={profile.accessibility === value} onClick={() => update({ accessibility: profile.accessibility === value ? '' : value })}>{label}</button>)}
        </div>
      </fieldset>
      <p className="onboarding-privacy">Tu nombre, ciudad y preferencias quedan guardados solo en este dispositivo.</p>
    </section>}

    {step === 2 && <section className="onboarding-step" aria-labelledby="onboarding-title">
      <p className="eyebrow">A TU MANERA</p><h1 id="onboarding-title">¿Qué te ayudaría a usarla mejor?</h1>
      <p className="onboarding-lead">Podés cambiar estas opciones cuando quieras.</p>
      <div className="preference-list">
        <button className="preference-row" role="switch" aria-checked={profile.largerText} onClick={() => update({ largerText: !profile.largerText })}><span className="preference-icon"><Eye/></span><span><strong>Texto más grande</strong><small>Para leer con mayor comodidad</small></span><span className={`switch-track ${profile.largerText ? 'on' : ''}`} aria-hidden="true"><i/></span></button>
        <button className="preference-row" role="switch" aria-checked={profile.highContrast} onClick={() => update({ highContrast: !profile.highContrast })}><span className="preference-icon contrast-icon" aria-hidden="true">◐</span><span><strong>Contraste alto</strong><small>Colores más definidos</small></span><span className={`switch-track ${profile.highContrast ? 'on' : ''}`} aria-hidden="true"><i/></span></button>
        <button className="preference-row" role="switch" aria-checked={profile.readScreens} onClick={() => update({ readScreens: !profile.readScreens })}><span className="preference-icon"><Volume2/></span><span><strong>Leer las pantallas en voz alta</strong><small>La app lee las instrucciones</small></span><span className={`switch-track ${profile.readScreens ? 'on' : ''}`} aria-hidden="true"><i/></span></button>
      </div>
      <div className="onboarding-hint"><Mic size={19}/><span>También podés dictar lo que necesitás cuando el navegador lo permite. Si no, siempre podés escribirlo.</span></div>
    </section>}

    {step === 3 && <section className="onboarding-step" aria-labelledby="onboarding-title">
      <p className="eyebrow">OPCIONAL</p><h1 id="onboarding-title">¿Querés vincular un medio de pago?</h1>
      <p className="onboarding-lead">Si elegís uno, será tu medio preferido y se usará para las transacciones de Acompáñame. Podés dejarlo para más adelante.</p>
      <div className="onboarding-payment-list" role="group" aria-label="Medio de pago preferido">
        {([
          ['debit-card', 'Tarjeta de débito'], ['credit-card', 'Tarjeta de crédito'], ['', 'Lo hago más adelante']
        ] as const).map(([value, label]) => <button key={value || 'later'} className={`onboarding-payment-choice ${profile.preferredPaymentMethod === value ? 'selected' : ''}`} aria-pressed={profile.preferredPaymentMethod === value} onClick={() => update({ preferredPaymentMethod: value })}><span className="preference-icon">{value ? <CreditCard/> : <span aria-hidden="true">⏳</span>}</span><strong>{label}</strong>{profile.preferredPaymentMethod === value && <Check size={20}/>}</button>)}
      </div>
      <p className="onboarding-privacy">Por ahora guardamos esta preferencia en este dispositivo. No pedimos ni guardamos números de tarjeta y todavía no procesamos pagos.</p>
    </section>}

    {step === 4 && <section className="onboarding-step trusted-onboarding-step" aria-labelledby="onboarding-title">
      <p className="eyebrow">SI ALGUNA VEZ LO NECESITÁS</p><h1 id="onboarding-title">¿A quién podrías llamar?</h1>
      <p className="onboarding-lead">Podés agregar hasta dos personas de confianza. Es opcional; Acompáñame funciona igual si preferís dejarlo vacío.</p>
      {[0, 1].map(index => {
        const contact = profile.trustedContacts[index] || { id: `trusted-${index}`, name: '', phone: '' };
        return <fieldset className="trusted-onboarding-contact" key={contact.id}>
          <legend>{index === 0 ? 'Persona 1' : 'Persona 2'} <span className="optional-label">(opcional)</span></legend>
          <label className="field-label" htmlFor={`trusted-name-${index}`}>Nombre</label>
          <input className="form-control" id={`trusted-name-${index}`} value={contact.name} onChange={event => updateContact(index, { name: event.target.value })} autoComplete="name" maxLength={60} placeholder="Por ejemplo: Ana"/>
          <label className="field-label" htmlFor={`trusted-phone-${index}`}>Teléfono</label>
          <input className="form-control" id={`trusted-phone-${index}`} type="tel" inputMode="tel" autoComplete="tel" value={contact.phone} onChange={event => updateContact(index, { phone: event.target.value })} maxLength={32} placeholder="Por ejemplo: 261 555 1234"/>
        </fieldset>;
      })}
      {contactError && <p className="trusted-error" role="alert">{contactError}</p>}
      <p className="onboarding-privacy">Los nombres y teléfonos se guardan solo en este dispositivo. No pedimos acceso a tu agenda.</p>
    </section>}

    {step === 5 && <section className="onboarding-step" aria-labelledby="onboarding-title">
      <p className="eyebrow">ANTES DE EMPEZAR</p><h1 id="onboarding-title">Revisemos tu configuración</h1>
      <dl className="onboarding-summary">
        <div><dt>La app está preparada para</dt><dd>{profile.role === 'self' ? 'La voy a usar yo' : 'Estoy ayudando a otra persona'}</dd></div>
        <div><dt>Nombre</dt><dd>{profile.name.trim() || 'Sin nombre por ahora'}</dd></div>
        <div><dt>Ciudad</dt><dd>{profile.city.trim() || 'Mendoza'}</dd></div>
        <div><dt>Contactos de confianza</dt><dd>{profile.trustedContacts.filter(contact => contact.name.trim() && contact.phone.trim()).length || 'Ninguno'}</dd></div>
        <div><dt>Preferencias de accesibilidad</dt><dd>{[
          profile.accessibility === 'older-adult' ? 'Persona mayor' : '',
          profile.accessibility === 'disability' ? 'Persona con discapacidad' : '',
          profile.accessibility === 'both' ? 'Persona mayor y con discapacidad' : '',
          profile.accessibility === 'prefer-not-to-say' ? 'Prefiere no decirlo' : '',
        ].filter(Boolean).join(', ') || 'No indicadas'}</dd></div>
        <div><dt>Texto grande</dt><dd>{profile.largerText ? 'Activado' : 'Desactivado'}</dd></div>
        <div><dt>Contraste alto</dt><dd>{profile.highContrast ? 'Activado' : 'Desactivado'}</dd></div>
        <div><dt>Lectura en voz alta</dt><dd>{profile.readScreens ? 'Activada' : 'Desactivada'}</dd></div>
        <div><dt>Medio de pago preferido</dt><dd>{profile.preferredPaymentMethod === 'debit-card' ? 'Tarjeta de débito' : profile.preferredPaymentMethod === 'credit-card' ? 'Tarjeta de crédito' : 'Lo elegiré más adelante'}</dd></div>
      </dl>
      <p className="onboarding-privacy">Esta configuración se guarda en este dispositivo. No es una cuenta ni se envía a un servicio externo.</p>
    </section>}

    <div className="onboarding-actions"><button className="secondary-button" onClick={back}><ArrowLeft size={18}/>{step === 0 ? 'Bienvenida' : 'Volver'}</button><button className="primary-button" onClick={next}>{step === steps.length - 1 ? 'Guardar y empezar' : 'Continuar'}{step === steps.length - 1 ? <Check size={19}/> : <ArrowRight size={19}/>}</button></div>
    {step < steps.length - 1 && <button className="onboarding-skip" onClick={() => onComplete(profile)}>Ahora no, ir al inicio</button>}
  </main>;
}
