import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Car, Check, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import type { SavedTask } from '../types';
import { addressLabel, type SavedAddress } from '../utils/addresses';

// Flujo "Pedir un viaje" (versión simulada).
// Pasos: hacia dónde → desde dónde → tipo de viaje → revisar → listo.
// En los dos primeros pasos el usuario toca una dirección guardada y pasa solo al paso siguiente.
// Agregar está debajo de la lista; editar y eliminar están en una pantalla aparte, "Mis direcciones".
// No pide ningún auto real: los tiempos y precios son de ejemplo.

type Step = 'to' | 'from' | 'options' | 'review' | 'done';
type RideOption = { id: string; label: string; detail: string; eta: string; price: string };
type Editor = { id: string | null; name: string; address: string; returnTo: 'choose' | 'manage' };

const steps: Step[] = ['to', 'from', 'options', 'review', 'done'];
const rideOptions: RideOption[] = [
  { id: 'auto', label: 'Auto', detail: 'Un auto común, para hasta 4 personas', eta: 'Llega en 5 minutos', price: '$4.500' },
  { id: 'espacio', label: 'Auto con más espacio', detail: 'Con baúl amplio, si viajás con andador o silla de ruedas plegable', eta: 'Llega en 9 minutos', price: '$5.800' },
];

interface Props {
  city: string;
  addresses: SavedAddress[];
  onAddressesChange: (addresses: SavedAddress[]) => void;
  onSave: (task: SavedTask) => void;
  onBack: () => void;
  onHome: () => void;
  onSaved: () => void;
  onStepChange: () => void;
}

export function TripFlow({ city: profileCity, addresses, onAddressesChange, onSave, onBack, onHome, onSaved, onStepChange }: Props) {
  const [step, setStep] = useState<Step>('to');
  const [toId, setToId] = useState('');
  const [fromId, setFromId] = useState('');
  const [rideId, setRideId] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [managing, setManaging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const city = profileCity.trim() || 'Mendoza';
  const stepIndex = steps.indexOf(step);
  useEffect(() => { onStepChange(); }, [step, editor === null, managing]);

  const destination = addresses.find(item => item.id === toId);
  const origin = addresses.find(item => item.id === fromId);
  const ride = rideOptions.find(item => item.id === rideId);
  const choosing = step === 'to' || step === 'from';
  const currentId = step === 'to' ? toId : fromId;
  // Elegir una dirección la guarda para el paso actual y avanza al siguiente.
  const choose = (id: string) => {
    if (step === 'to') { setToId(id); if (fromId === id) setFromId(''); setStep('from'); }
    else { setFromId(id); setStep('options'); }
  };
  // En "desde dónde" no se muestra la dirección elegida como destino, para que no se repitan.
  const visibleAddresses = step === 'from' ? addresses.filter(item => item.id !== toId) : addresses;

  const back = () => {
    if (editor) { setEditor(null); return; }
    if (managing) { setManaging(false); setConfirmDelete(''); return; }
    if (step === 'done') { onHome(); return; }
    if (stepIndex === 0) { onBack(); return; }
    setConfirmDelete('');
    setStep(steps[stepIndex - 1]);
  };
  const next = () => { setConfirmDelete(''); setStep(steps[stepIndex + 1]); };

  const saveAddress = () => {
    if (!editor || !editor.address.trim()) return;
    const clean = { name: editor.name.trim(), address: editor.address.trim() };
    if (editor.id) {
      onAddressesChange(addresses.map(item => item.id === editor.id ? { ...item, ...clean } : item));
    } else {
      const created: SavedAddress = { id: crypto.randomUUID(), ...clean };
      onAddressesChange([...addresses, created]);
      // Si la agregó mientras elegía, la dirección nueva queda elegida y pasa al paso siguiente.
      if (editor.returnTo === 'choose') choose(created.id);
    }
    setEditor(null);
  };
  const deleteAddress = (id: string) => {
    onAddressesChange(addresses.filter(item => item.id !== id));
    if (fromId === id) setFromId('');
    if (toId === id) { setToId(''); if (step === 'from') setStep('to'); }
    setConfirmDelete('');
  };

  const confirmTrip = () => {
    if (!origin || !destination || !ride) return;
    onSave({
      id: crypto.randomUUID(), kind: 'trip', title: 'Viaje',
      description: `Desde ${addressLabel(origin)} (${origin.address}) hasta ${addressLabel(destination)} (${destination.address}) · ${ride.label} · ${ride.price} estimado`,
      createdAt: new Date().toISOString(), mode: 'demo'
    });
    setStep('done');
  };

  const stepLabel = editor ? (editor.id ? 'Editar dirección' : 'Nueva dirección') : managing ? 'Mis direcciones' : step === 'review' ? 'Revisar' : step === 'done' ? 'Listo' : `Paso ${stepIndex + 1} de 3`;

  const goHome = () => {
  const hasUnsavedChanges = step !== 'done' && (
    step !== 'to' ||
    Boolean(toId || fromId || rideId || editor?.name.trim() || editor?.address.trim())
  );
  if (
    hasUnsavedChanges &&
    !window.confirm('Tenés datos sin guardar. Si volvés al inicio, podrías perderlos. ¿Querés continuar?')
  ) return;
  onHome();
  };
  
  return <main id="main" className="page flow-page cinema-flow">
    <div className="flow-top"><button className="back-button" onClick={back}><ArrowLeft size={20}/> {step === 'done' && !editor ? 'Inicio' : 'Volver'}</button>{step !== 'done' && <button className="home-link" onClick={goHome}>Ir al inicio</button>}</div>
    <div className="flow-progress"><span className="flow-mark"><Car size={20}/></span><span>Pedir un viaje</span><span className="step-label">{stepLabel}</span></div>

    {editor && <>
      <div className="flow-heading"><h1>{editor.id ? 'Editar dirección' : 'Nueva dirección'}</h1><p>Escribí la dirección y, si querés, un nombre para reconocerla fácil.</p></div>
      <form className="form-card" onSubmit={e => { e.preventDefault(); saveAddress(); }}>
        <label className="field-label" htmlFor="address-street">Dirección</label>
        <input id="address-street" className="form-control" autoComplete="street-address" value={editor.address} onChange={e => setEditor({ ...editor, address: e.target.value })} placeholder="Por ejemplo: Av. San Martín 1200"/>
        <label className="field-label" htmlFor="address-name">Nombre (opcional)</label>
        <input id="address-name" className="form-control" value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} placeholder="Por ejemplo: Casa, Hospital, Club"/>
        <div className="privacy-note"><MapPin size={18}/><span>Buscamos esta dirección en {city}.</span></div>
        <button type="submit" className="primary-button full-button" disabled={!editor.address.trim()}><Check size={19}/> Guardar dirección</button>
        <button type="button" className="secondary-button full-button" onClick={() => setEditor(null)}>Cancelar</button>
      </form>
    </>}

    {!editor && !managing && choosing && <>
      <div className="flow-heading"><h1>{step === 'to' ? '¿Hacia dónde vas?' : '¿Desde dónde salís?'}</h1><p>{visibleAddresses.length ? 'Tocá una de tus direcciones.' : 'Todavía no tenés direcciones guardadas. Agregá la primera.'}</p></div>
      <section className="form-card">
        {step === 'from' && destination && <p className="form-intro">Vas hacia <strong>{addressLabel(destination)}</strong>.</p>}
        <div className="cinema-choices">
          {visibleAddresses.map(item => <button key={item.id} type="button" aria-pressed={currentId === item.id} className={`cinema-pick${currentId === item.id ? ' selected' : ''}`} onClick={() => choose(item.id)}>
            <span className="cinema-pick-icon"><MapPin size={21}/></span>
            <span className="cinema-pick-copy"><strong>{addressLabel(item)}</strong>{item.name.trim() && <small>{item.address}</small>}</span>
            {currentId === item.id ? <Check className="cinema-pick-check" size={21}/> : <ArrowRight className="cinema-pick-check" size={21}/>}
          </button>)}
        </div>
        <button type="button" className={`${visibleAddresses.length ? 'secondary-button' : 'primary-button'} full-button`} style={{ marginTop: 22 }} onClick={() => setEditor({ id: null, name: '', address: '', returnTo: 'choose' })}><Plus size={19}/> Agregar una dirección nueva</button>
        {addresses.length > 0 && <div style={{ textAlign: 'center', marginTop: 10 }}><button type="button" className="text-button" onClick={() => setManaging(true)}><Pencil size={17}/> Editar mis direcciones</button></div>}
      </section>
    </>}

    {!editor && managing && <>
      <div className="flow-heading"><h1>Mis direcciones</h1><p>Acá podés cambiar o eliminar tus direcciones guardadas.</p></div>
      <section className="form-card">
        {addresses.length === 0 && <p className="form-intro">No tenés direcciones guardadas.</p>}
        <div className="cinema-choices">
          {addresses.map(item => <div key={item.id} className="cinema-pick" style={{ flexWrap: 'wrap' }}>
            <span className="cinema-pick-icon"><MapPin size={21}/></span>
            <span className="cinema-pick-copy" style={{ flex: 1 }}><strong>{addressLabel(item)}</strong>{item.name.trim() && <small>{item.address}</small>}</span>
            {confirmDelete === item.id
              ? <div role="alert" style={{ flexBasis: '100%', padding: '12px', borderRadius: 12, background: '#fdf1ee', border: '1px solid #f0cfc6' }}>
                  <p style={{ margin: '0 0 10px' }}>¿Querés eliminar <strong>{addressLabel(item)}</strong>?</p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <button type="button" className="secondary-button" style={{ minHeight: 52, color: '#a23b22', borderColor: '#e2b3a6', background: '#fff' }} onClick={() => deleteAddress(item.id)}><Trash2 size={19}/> Sí, eliminar</button>
                    <button type="button" className="secondary-button" style={{ minHeight: 52 }} onClick={() => setConfirmDelete('')}>No, dejarla</button>
                  </div>
                </div>
              : <div style={{ flexBasis: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                  <button type="button" className="secondary-button" style={{ minHeight: 52 }} onClick={() => setEditor({ id: item.id, name: item.name, address: item.address, returnTo: 'manage' })} aria-label={`Editar ${addressLabel(item)}`}><Pencil size={19}/> Editar</button>
                  <button type="button" className="secondary-button" style={{ minHeight: 52, color: '#a23b22' }} onClick={() => setConfirmDelete(item.id)} aria-label={`Eliminar ${addressLabel(item)}`}><Trash2 size={19}/> Eliminar</button>
                </div>}
          </div>)}
        </div>
        <button type="button" className="secondary-button full-button" style={{ marginTop: 22 }} onClick={() => { setConfirmDelete(''); setEditor({ id: null, name: '', address: '', returnTo: 'manage' }); }}><Plus size={19}/> Agregar una dirección nueva</button>
        <button type="button" className="primary-button full-button" style={{ marginTop: 28 }} onClick={() => { setManaging(false); setConfirmDelete(''); }}><Check size={19}/> Listo</button>
      </section>
    </>}

    {!editor && step === 'options' && <>
      <div className="flow-heading"><h1>¿Qué tipo de viaje preferís?</h1><p>Los tiempos y precios son estimados.</p></div>
      <section className="form-card">
        <div className="cinema-choices">{rideOptions.map(option => <button key={option.id} type="button" aria-pressed={rideId === option.id} className={`cinema-pick${rideId === option.id ? ' selected' : ''}`} onClick={() => setRideId(option.id)}>
          <span className="cinema-pick-icon"><Car size={21}/></span>
          <span className="cinema-pick-copy"><strong>{option.label} · {option.price}</strong><small>{option.eta}. {option.detail}.</small></span>
          {rideId === option.id && <Check className="cinema-pick-check" size={21}/>}
        </button>)}</div>
        <button className="primary-button full-button" disabled={!rideId} onClick={next}><span>Continuar</span><ArrowRight size={19}/></button>
      </section>
    </>}

    {!editor && step === 'review' && origin && destination && ride && <>
      <div className="flow-heading"><h1>Revisemos antes de continuar</h1><p>Este es el viaje que elegiste.</p></div>
      <section className="confirm-card"><div className="confirm-icon"><Car size={24}/></div><h2>Tu viaje</h2>
        <div className="confirm-details">
          <ReviewRow label="Desde" value={`${addressLabel(origin)}${origin.name.trim() ? ` · ${origin.address}` : ''}`}/>
          <ReviewRow label="Hasta" value={`${addressLabel(destination)}${destination.name.trim() ? ` · ${destination.address}` : ''}`}/>
          <ReviewRow label="Tipo de viaje" value={ride.label}/>
          <ReviewRow label="Precio estimado" value={ride.price}/>
        </div>
        <p className="cinema-honesty">Esta versión no pide autos ni realiza cobros.</p>
        <button className="primary-button full-button" onClick={confirmTrip}><Check size={19}/> Confirmar viaje</button>
        <button className="secondary-button full-button" onClick={() => setStep('options')}>Cambiar algo</button>
      </section>
    </>}

    {!editor && step === 'done' && ride && <section className="done-card"><span className="done-check"><Check size={28}/></span><h1>Viaje guardado</h1>
      <p>Guardamos el viaje en Mis gestiones. No se pidió ningún auto ni se realizó un cobro.</p>
      <p style={{ margin: '18px 0 0', fontWeight: 800, textAlign: 'left' }}>Seguimiento del viaje</p>
      <div className="confirm-details" style={{ textAlign: 'left' }}>
        <ReviewRow label="Estado" value={ride.eta}/>
        <ReviewRow label="Conductor" value="Carlos"/>
        <ReviewRow label="Auto" value="Toyota Etios gris"/>
        <ReviewRow label="Patente" value="AB 123 CD"/>
      </div>
      <button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button>
      <button className="text-button" onClick={goHome}>Volver al inicio</button>
    </section>}
  </main>;
}

function ReviewRow({ label, value }: { label: string; value: string }) { return <p><span>{label}</span><strong>{value}</strong></p>; }
