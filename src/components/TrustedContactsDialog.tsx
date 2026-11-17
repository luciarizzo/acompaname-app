import { ArrowLeft, Pencil, Plus, Phone, Trash2, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isAccountMode } from '../utils/storageMode';
import { phoneLink, trustedContactError, type TrustedContact } from '../utils/trustedContacts';

interface Props {
  contacts: TrustedContact[];
  onContactsChange: (contacts: TrustedContact[]) => void;
  onClose: () => void;
}

export function TrustedContactsDialog({ contacts, onContactsChange, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TrustedContact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (document.activeElement === dialogRef.current || !dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleDialogKeys);
    return () => { window.removeEventListener('keydown', handleDialogKeys); previousFocus?.focus(); };
  }, []);
  useEffect(() => { if (adding) nameRef.current?.focus(); }, [adding]);
  useEffect(() => { if (pendingDelete) deleteRef.current?.focus(); }, [pendingDelete]);

  const startAdding = () => {
    if (contacts.length >= 2) return;
    setEditingId(null);
    setName('');
    setPhone('');
    setError('');
    setNotice('');
    setAdding(true);
  };
  const startEditing = (contact: TrustedContact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setError('');
    setNotice('');
    setAdding(true);
  };
  const deleteContact = () => {
    if (!pendingDelete) return;
    onContactsChange(contacts.filter(contact => contact.id !== pendingDelete.id));
    setNotice(`Eliminaste a ${pendingDelete.name} de tus contactos de confianza.`);
    setPendingDelete(null);
  };
  const saveContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const validationError = trustedContactError(cleanName, cleanPhone);
    if (validationError) { setError(validationError); return; }
    if (!editingId && contacts.length >= 2) { setError('Ya tenés dos contactos.'); return; }
    if (editingId && !contacts.some(contact => contact.id === editingId)) { setError('No encontramos este contacto. Volvé a la lista.'); return; }
    const updated = editingId
      ? contacts.map(contact => contact.id === editingId ? { ...contact, name: cleanName, phone: cleanPhone } : contact)
      : [...contacts, { id: crypto.randomUUID(), name: cleanName, phone: cleanPhone }];
    onContactsChange(updated);
    setNotice(editingId ? 'Actualizaste el contacto de confianza.' : 'Agregaste un contacto de confianza.');
    setEditingId(null);
    setError('');
    setAdding(false);
  };

  return <div className="trusted-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="trusted-dialog" role="dialog" aria-modal="true" aria-labelledby="trusted-dialog-title" tabIndex={-1}>
      <div className="trusted-dialog-header">
        <div className="trusted-title-icon"><Phone size={22}/></div>
        <div><p className="eyebrow">ACOMPAÑAMIENTO</p><h2 id="trusted-dialog-title">Contactos de confianza</h2></div>
        <button className="trusted-close" type="button" aria-label="Cerrar contactos" onClick={onClose}><X size={22}/></button>
      </div>

      {pendingDelete ? <section className="trusted-delete-confirm" aria-labelledby="trusted-delete-title">
        <h3 id="trusted-delete-title">¿Eliminar este contacto?</h3>
        <p>Vas a quitar a <strong>{pendingDelete.name}</strong> de tus contactos de confianza. Después no aparecerá en la lista para llamar.</p>
        <div className="trusted-form-actions"><button className="secondary-button" type="button" onClick={() => setPendingDelete(null)}>Cancelar</button><button ref={deleteRef} className="trusted-delete-button" type="button" onClick={deleteContact}><Trash2 size={18}/> Sí, eliminar</button></div>
      </section> : adding ? <>
        <button className="back-button trusted-return" type="button" onClick={() => setAdding(false)}><ArrowLeft size={18}/> Volver a mis contactos</button>
        <h3>{editingId ? 'Editar contacto' : 'Agregar un contacto'}</h3>
        <p className="trusted-explainer">Guardá el nombre y teléfono de alguien a quien puedas llamar si necesitás ayuda.</p>
        <form onSubmit={saveContact} noValidate>
          <label className="field-label" htmlFor="new-contact-name">Nombre</label>
          <input ref={nameRef} id="new-contact-name" className="form-control" value={name} maxLength={60} autoComplete="name" onChange={event => { setName(event.target.value); setError(''); }} placeholder="Por ejemplo: Ana"/>
          <label className="field-label" htmlFor="new-contact-phone">Teléfono</label>
          <input id="new-contact-phone" className="form-control" type="tel" inputMode="tel" autoComplete="tel" maxLength={32} value={phone} onChange={event => { setPhone(event.target.value); setError(''); }} placeholder="Por ejemplo: 261 555 1234"/>
          {error && <p className="trusted-error" role="alert">{error}</p>}
          <div className="trusted-form-actions"><button className="secondary-button" type="button" onClick={() => setAdding(false)}>Cancelar</button><button className="primary-button" type="submit">{editingId ? 'Guardar cambios' : 'Guardar contacto'}</button></div>
        </form>
      </> : <>
        <p className="trusted-explainer">Si necesitás ayuda, podés llamar a alguien de confianza. Acompáñame queda abierta y vas a poder seguir donde estabas.</p>
        {notice && <p className="trusted-notice" role="status">{notice}</p>}
        {contacts.length > 0 ? <section className="trusted-contact-list" aria-label="Tus contactos de confianza">
          {contacts.slice(0, 2).map(contact => <article className="trusted-contact" key={contact.id}>
            <span className="trusted-avatar" aria-hidden="true"><UserRound size={22}/></span>
            <div className="trusted-contact-info"><strong>{contact.name}</strong><span>{contact.phone}</span></div>
            <div className="trusted-contact-actions">
              <button className="trusted-manage" type="button" onClick={() => startEditing(contact)} aria-label={`Editar los datos de ${contact.name}`}><Pencil size={17}/><span>Editar</span></button>
              <button className="trusted-manage trusted-danger" type="button" onClick={() => { setNotice(''); setPendingDelete(contact); }} aria-label={`Eliminar a ${contact.name}`}><Trash2 size={17}/><span>Eliminar</span></button>
              <a className="trusted-call" href={`tel:${phoneLink(contact.phone)}`} aria-label={`Llamar a ${contact.name}`}><Phone size={19}/><span>Llamar</span></a>
            </div>
          </article>)}
        </section> : <div className="trusted-empty"><UserRound size={22}/><p>No agregaste contactos de confianza. Podés seguir usando Acompáñame con normalidad.</p></div>}
        {contacts.length < 2 ? <button className="secondary-button trusted-add" type="button" onClick={startAdding}><Plus size={19}/> Agregar contacto</button> : <p className="trusted-limit">Ya tenés dos contactos guardados. Si querés agregar otro, primero eliminá uno.</p>}
        <p className="trusted-privacy">Los datos se guardan {isAccountMode() ? 'en tu cuenta' : 'en este dispositivo'}. No accedemos a la agenda del teléfono ni enviamos mensajes automáticamente.</p>
      </>}
    </section>
  </div>;
}
