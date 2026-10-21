import { Phone, Plus, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getTrustedContacts, phoneLink, saveTrustedContacts, type TrustedContact } from '../utils/trustedContacts';

interface Props { onClose: () => void }

export function TrustedContactsDialog({ onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const [contacts, setContacts] = useState(getTrustedContacts);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleDialogKeys);
    return () => { window.removeEventListener('keydown', handleDialogKeys); previousFocus?.focus(); };
  }, []);

  const store = (next: TrustedContact[]) => {
    if (!saveTrustedContacts(next)) {
      setError('No pude guardar el contacto en este dispositivo. Revisá el espacio disponible y volvé a intentarlo.');
      return false;
    }
    setContacts(next);
    setError('');
    return true;
  };

  const addContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (cleanPhone.replace(/\D/g, '').length < 7) {
      setError('Revisá el número. Tiene que incluir al menos 7 dígitos.');
      return;
    }
    const contact = { id: crypto.randomUUID(), name: cleanName, phone: cleanPhone };
    if (store([...contacts, contact])) { setName(''); setPhone(''); }
  };

  const removeContact = (id: string) => {
    if (confirmingRemoval === id) { store(contacts.filter(contact => contact.id !== id)); setConfirmingRemoval(null); }
    else setConfirmingRemoval(id);
  };

  return <div className="trusted-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
  <section ref={dialogRef} className="trusted-dialog" role="dialog" aria-modal="true" aria-labelledby="trusted-dialog-title" tabIndex={-1}>
    <div className="trusted-dialog-header">
      <div className="trusted-title-icon"><Phone size={22}/></div>
      <div><p className="eyebrow">ACOMPAÑAMIENTO</p><h2 id="trusted-dialog-title">Contactos de confianza</h2></div>
      <button className="trusted-close" type="button" aria-label="Cerrar contactos" onClick={onClose}><X size={22}/></button>
    </div>
    <p className="trusted-explainer">Si necesitás ayuda, podés llamar a alguien de confianza. Acompáñame queda abierta y vas a poder seguir donde estabas.</p>

    {contacts.length > 0 ? <section className="trusted-contact-list" aria-label="Tus contactos de confianza">
      {contacts.map(contact => <article className="trusted-contact" key={contact.id}>
        <span className="trusted-avatar" aria-hidden="true"><UserRound size={22}/></span>
        <div className="trusted-contact-info"><strong>{contact.name}</strong><span>{contact.phone}</span></div>
        <a className="trusted-call" href={`tel:${phoneLink(contact.phone)}`} aria-label={`Llamar a ${contact.name}`}><Phone size={19}/><span>Llamar</span></a>
        {confirmingRemoval === contact.id ? <div className="trusted-remove-confirm" role="group" aria-label={`Confirmar que querés quitar a ${contact.name}`}><span>¿Quitar este contacto?</span><button type="button" onClick={() => setConfirmingRemoval(null)}>Mantener</button><button type="button" onClick={() => removeContact(contact.id)}>Quitar</button></div> : <button className="trusted-remove" type="button" onClick={() => removeContact(contact.id)} aria-label={`Quitar a ${contact.name}`}>Quitar</button>}
      </article>)}
    </section> : <div className="trusted-empty"><UserRound size={22}/><p>Agregá a una persona de confianza para tenerla a mano cuando la necesites.</p></div>}

    <form className="trusted-form" onSubmit={addContact}>
      <h3>{contacts.length ? 'Agregar otra persona' : 'Agregar una persona'}</h3>
      <label className="field-label" htmlFor="trusted-name">Nombre</label>
      <input className="form-control" id="trusted-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={60} required placeholder="Por ejemplo: Ana"/>
      <label className="field-label" htmlFor="trusted-phone">Teléfono</label>
      <input className="form-control" id="trusted-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={32} required placeholder="Por ejemplo: 261 555 1234"/>
      <p className="trusted-local-note">Los contactos se guardan solo en este dispositivo. Al tocar “Llamar”, se abre la aplicación de teléfono.</p>
      {error && <p className="trusted-error" role="alert">{error}</p>}
      <button className="primary-button full-button" type="submit"><Plus size={19}/>Guardar contacto</button>
    </form>
  </section>
  </div>;
}
