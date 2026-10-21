import { Phone, UserRound, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { phoneLink, type TrustedContact } from '../utils/trustedContacts';

interface Props { contacts: TrustedContact[]; onClose: () => void }

export function TrustedContactsDialog({ contacts, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleDialogKeys);
    return () => { window.removeEventListener('keydown', handleDialogKeys); previousFocus?.focus(); };
  }, []);

  return <div className="trusted-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="trusted-dialog" role="dialog" aria-modal="true" aria-labelledby="trusted-dialog-title" tabIndex={-1}>
      <div className="trusted-dialog-header">
        <div className="trusted-title-icon"><Phone size={22}/></div>
        <div><p className="eyebrow">ACOMPAÑAMIENTO</p><h2 id="trusted-dialog-title">Contactos de confianza</h2></div>
        <button className="trusted-close" type="button" aria-label="Cerrar contactos" onClick={onClose}><X size={22}/></button>
      </div>
      <p className="trusted-explainer">Si necesitás ayuda, podés llamar a alguien de confianza. Acompáñame queda abierta y vas a poder seguir donde estabas.</p>

      {contacts.length > 0 ? <section className="trusted-contact-list" aria-label="Tus contactos de confianza">
        {contacts.slice(0, 2).map(contact => <article className="trusted-contact" key={contact.id}>
          <span className="trusted-avatar" aria-hidden="true"><UserRound size={22}/></span>
          <div className="trusted-contact-info"><strong>{contact.name}</strong><span>{contact.phone}</span></div>
          <a className="trusted-call" href={`tel:${phoneLink(contact.phone)}`} aria-label={`Llamar a ${contact.name}`}><Phone size={19}/><span>Llamar</span></a>
        </article>)}
      </section> : <div className="trusted-empty"><UserRound size={22}/><p>No agregaste contactos de confianza. Podés seguir usando Acompáñame con normalidad.</p></div>}
    </section>
  </div>;
}
