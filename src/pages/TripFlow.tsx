import { loadFlowDraft, saveFlowDraft, removeFlowDraft } from '../utils/flowDraft';
import { useBrowserBack } from '../utils/useBrowserBack';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Car, Check, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import type { SavedTask } from '../types';
import { addressLabel, hasLocation, type SavedAddress } from '../utils/addresses';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { StatusMessage } from '../components/StatusMessage';
import { cancelTrip, estimateTrip, formatPrice, requestTrip, tripStatus, type Trip, type TripEstimate, type TripPoint, type TripState } from '../services/trips';

// Flujo "Pedir un viaje", conectado a la API de viajes (netlify/functions/viajes.mjs).
// Pasos: hacia dónde → desde dónde → tipo de viaje (cotizado por la API) → revisar → seguimiento del viaje.
// En los dos primeros pasos el usuario toca una dirección guardada y pasa solo al paso siguiente.
// Las direcciones se eligen de una lista de sugerencias, así la API sabe dónde quedan.
// Agregar está debajo de la lista; editar y eliminar están en una pantalla aparte, "Mis direcciones".

type Step = 'to' | 'from' | 'options' | 'review' | 'done';
type Editor = { id: string | null; name: string; address: string; lat?: number; lon?: number; returnTo: 'choose' | 'manage' };

const steps: Step[] = ['to', 'from', 'options', 'review', 'done'];
interface TripDraft { step: Step; toId: string; fromId: string; rideId: string }
const toPoint = (item: SavedAddress & { lat: number; lon: number }): TripPoint => ({ lat: item.lat, lon: item.lon, label: addressLabel(item) });
const minutes = (n: number) => `${n} ${n === 1 ? 'minuto' : 'minutos'}`;
const statusOrder: TripState['status'][] = ['searching', 'arriving', 'waiting', 'in_progress', 'completed'];

interface Props {
  city: string;
  province?: string;
  cityLat?: number;
  cityLon?: number;
  onEditCity?: () => void;
  addresses: SavedAddress[];
  onAddressesChange: (addresses: SavedAddress[]) => void;
  onSave: (task: SavedTask) => void;
  onBack: () => void;
  onHome: () => void;
  onSaved: () => void;
  onStepChange: () => void;
}

export function TripFlow({ city: profileCity, province, cityLat, cityLon, onEditCity, addresses, onAddressesChange, onSave, onBack, onHome, onSaved, onStepChange }: Props) {
  const [previous] = useState(() => {
    const saved = loadFlowDraft<TripDraft>('trip');
    if (saved && ((saved.toId && !addresses.some(item => item.id === saved.toId)) || (saved.fromId && !addresses.some(item => item.id === saved.fromId)))) {
      removeFlowDraft('trip'); return null;
    }
    return saved;
  });
  const [resumePrompt, setResumePrompt] = useState(Boolean(previous));
  const [step, setStep] = useState<Step>(() => previous && steps.includes(previous.step) && previous.step !== 'done' ? previous.step : 'to');
  const [toId, setToId] = useState(() => previous?.toId ?? '');
  const [fromId, setFromId] = useState(() => previous?.fromId ?? '');
  const [rideId, setRideId] = useState(() => previous?.rideId ?? '');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [managing, setManaging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [estimate, setEstimate] = useState<TripEstimate | null>(null);
  const [estimateError, setEstimateError] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [trip, setTrip] = useState<{ token: string; trip: Trip; state: TripState } | null>(null);
  const savedTrip = useRef(false);
  // Las direcciones se buscan solo cerca de la ciudad del perfil.
  const city = profileCity.trim();
  const location = { city, province, lat: cityLat, lon: cityLon };
  const stepIndex = steps.indexOf(step);
  useEffect(() => { onStepChange(); }, [step, editor === null, managing]);
  useEffect(() => {
    if (resumePrompt) return;
    if (step === 'done') { removeFlowDraft('trip'); return; }
    if (step === 'to' && !toId) { removeFlowDraft('trip'); return; }
    saveFlowDraft('trip', { step, toId, fromId, rideId } satisfies TripDraft);
  }, [step, toId, fromId, rideId, resumePrompt]);
  const discardDraft = () => {removeFlowDraft('trip');setStep('to');setToId('');setFromId('');setRideId('');setResumePrompt(false);};

  const destination = addresses.find(item => item.id === toId);
  const origin = addresses.find(item => item.id === fromId);
  const ride = estimate?.options.find(item => item.id === rideId);
  const located = hasLocation(origin) && hasLocation(destination);

  // Al llegar a "tipo de viaje", la API cotiza el recorrido entre las dos direcciones.
  const estimateKey = useRef('');
  useEffect(() => {
    if ((step !== 'options' && step !== 'review') || !hasLocation(origin) || !hasLocation(destination)) return;
    const key = `${origin.lat},${origin.lon}>${destination.lat},${destination.lon}`;
    if (key === estimateKey.current && (estimate || estimateError)) return;
    estimateKey.current = key;
    let cancelled = false;
    setEstimate(null); setEstimateError('');
    estimateTrip(toPoint(origin), toPoint(destination))
      .then(result => { if (!cancelled) setEstimate(result); })
      .catch(error => { if (!cancelled) setEstimateError(error instanceof Error ? error.message : 'No pudimos calcular el viaje.'); });
    return () => { cancelled = true; };
  }, [step, origin?.lat, origin?.lon, destination?.lat, destination?.lon]);

  // Durante el viaje se consulta el estado cada 3 segundos.
  useEffect(() => {
    if (step !== 'done' || !trip || trip.state.status === 'completed' || trip.state.status === 'cancelled') return;
    const timer = window.setInterval(async () => {
      try {
        const { state } = await tripStatus(trip.token);
        setTrip(current => current && current.token === trip.token ? { ...current, state } : current);
      } catch { /* se reintenta en la próxima consulta */ }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [step, trip?.token, trip?.state.status]);
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
    if (step === 'review') setRequestError('');
    if (stepIndex === 0) { onBack(); return; }
    setConfirmDelete('');
    setStep(steps[stepIndex - 1]);
  };
  useBrowserBack(back);
  const next = () => { setConfirmDelete(''); setStep(steps[stepIndex + 1]); };

  const saveAddress = () => {
    if (!editor || !editor.address.trim()) return;
    if (!Number.isFinite(editor.lat) || !Number.isFinite(editor.lon)) return;
    const clean = { name: editor.name.trim(), address: editor.address.trim(), lat: editor.lat, lon: editor.lon };
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

  const confirmTrip = async () => {
    if (!hasLocation(origin) || !hasLocation(destination) || !ride || busy) return;
    setBusy(true); setRequestError('');
    try {
      const result = await requestTrip(toPoint(origin), toPoint(destination), ride.id);
      setTrip(result);
      if (!savedTrip.current) {
        savedTrip.current = true;
        const { trip: t } = result;
        onSave({
          id: crypto.randomUUID(), kind: 'trip', title: 'Viaje',
          description: `Desde ${addressLabel(origin)} (${origin.address}) hasta ${addressLabel(destination)} (${destination.address}) · ${t.rideLabel} · ${formatPrice(t.price)} · ${t.driver.name}, ${t.vehicle.model} ${t.vehicle.color} ${t.vehicle.plate}`,
          createdAt: new Date().toISOString(), mode: 'real'
        });
      }
      removeFlowDraft('trip');
      setStep('done');
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'No pudimos pedir el viaje. Probá de nuevo.');
    } finally { setBusy(false); }
  };
  const cancelCurrentTrip = async () => {
    if (!trip || busy) return;
    setBusy(true); setRequestError('');
    try { setTrip(await cancelTrip(trip.token)); }
    catch (error) { setRequestError(error instanceof Error ? error.message : 'No pudimos cancelar el viaje.'); }
    finally { setBusy(false); }
  };

  const stepLabel = editor ? (editor.id ? 'Editar dirección' : 'Nueva dirección') : managing ? 'Mis direcciones' : step === 'review' ? 'Revisar' : step === 'done' ? 'Tu viaje' : `Paso ${stepIndex + 1} de 3`;

  return <main id="main" className="page flow-page cinema-flow">
    <div className="flow-top"><button className="back-button" onClick={back}><ArrowLeft size={20}/> {step === 'done' && !editor ? 'Ir al inicio' : stepIndex === 0 && !editor && !managing ? 'Volver a las opciones' : 'Volver al paso anterior'}</button>{step !== 'done' && <button className="home-link" onClick={onHome}>Ir al inicio</button>}</div>
    {resumePrompt && <section className="draft-resume" aria-label="Retomar un viaje">
      <h2>Tenías un viaje sin terminar</h2><p>Podés retomarlo o empezar de nuevo. Todavía no se solicitó ningún vehículo.</p>
      <div className="draft-resume-actions"><button className="primary-button" onClick={() => setResumePrompt(false)}>Retomar mi recorrido</button><button className="secondary-button" onClick={discardDraft}>Empezar de nuevo</button></div>
    </section>}
    <div className="flow-progress"><span className="flow-mark"><Car size={20}/></span><span>Pedir un viaje</span><span className="step-label">{stepLabel}</span></div>

    {!resumePrompt && <>{editor && <>
      <div className="flow-heading"><h1>{editor.id ? 'Editar dirección' : 'Nueva dirección'}</h1><p>Escribí la dirección y, si querés, un nombre para reconocerla fácil.</p></div>
      <form className="form-card" onSubmit={e => { e.preventDefault(); saveAddress(); }}>
        <label className="field-label" htmlFor="address-street">Dirección o lugar</label>
        {!city ? <><StatusMessage kind="info">Para buscar direcciones cerca tuyo, primero contanos en qué ciudad estás.</StatusMessage>{onEditCity && <button type="button" className="secondary-button full-button" onClick={onEditCity}><MapPin size={18}/> Elegir mi ciudad</button>}</> : <AddressAutocomplete id="address-street" value={editor.address} location={location} selected={Number.isFinite(editor.lat)}
          onType={value => setEditor({ ...editor, address: value, lat: undefined, lon: undefined })}
          onSelect={item => setEditor({ ...editor, address: item.detail ? `${item.label}, ${item.detail}` : item.label, lat: item.lat, lon: item.lon, name: editor.name || (/\d/.test(item.label) ? '' : item.label) })}/>}
        {Number.isFinite(editor.lat) && <p className="address-selected"><Check size={18}/> Dirección encontrada</p>}
        <label className="field-label" htmlFor="address-name">Nombre (opcional)</label>
        <input id="address-name" className="form-control" value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} placeholder="Por ejemplo: Casa, Hospital, Club"/>
        <div className="privacy-note"><MapPin size={18}/><span>Buscamos en {city}{province ? `, ${province}` : ''}. Escribí y tocá la dirección correcta en la lista.</span></div>
        <button type="submit" className="primary-button full-button" disabled={!editor.address.trim() || !Number.isFinite(editor.lat)}><Check size={19}/> Guardar dirección</button>
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
            {currentId === item.id ? <span className="selected-indicator" aria-hidden="true">Elegido</span> : <ArrowRight className="cinema-pick-check" size={21}/>}
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
                  <button type="button" className="secondary-button" style={{ minHeight: 52 }} onClick={() => setEditor({ id: item.id, name: item.name, address: item.address, lat: item.lat, lon: item.lon, returnTo: 'manage' })} aria-label={`Editar ${addressLabel(item)}`}><Pencil size={19}/> Editar</button>
                  <button type="button" className="secondary-button" style={{ minHeight: 52, color: '#a23b22' }} onClick={() => setConfirmDelete(item.id)} aria-label={`Eliminar ${addressLabel(item)}`}><Trash2 size={19}/> Eliminar</button>
                </div>}
          </div>)}
        </div>
        <button type="button" className="secondary-button full-button" style={{ marginTop: 22 }} onClick={() => { setConfirmDelete(''); setEditor({ id: null, name: '', address: '', returnTo: 'manage' }); }}><Plus size={19}/> Agregar una dirección nueva</button>
        <button type="button" className="primary-button full-button" style={{ marginTop: 28 }} onClick={() => { setManaging(false); setConfirmDelete(''); }}><Check size={19}/> Listo</button>
      </section>
    </>}

    {!editor && step === 'options' && <>
      <div className="flow-heading"><h1>¿Qué tipo de viaje preferís?</h1><p>{estimate ? `${estimate.distanceKm.toLocaleString('es-AR')} km · unos ${minutes(estimate.durationMinutes)} de viaje.` : 'Calculamos el precio según tu recorrido.'}</p></div>
      <section className="form-card">
        {!located && <>
          <StatusMessage kind="info">Para calcular el viaje necesitamos ubicar {!hasLocation(destination) ? 'el destino' : 'el origen'} en el mapa. Editala y elegila de la lista de sugerencias.</StatusMessage>
          <button type="button" className="primary-button full-button" onClick={() => { const item = !hasLocation(destination) ? destination : origin; if (item) setEditor({ id: item.id, name: item.name, address: item.address, returnTo: 'manage' }); }}><Pencil size={19}/> Ubicar la dirección</button>
        </>}
        {located && !estimate && !estimateError && <StatusMessage kind="loading">Calculando precios y tiempos…</StatusMessage>}
        {estimateError && <><StatusMessage kind="error">{estimateError}</StatusMessage><button type="button" className="secondary-button full-button" onClick={() => setStep('from')}>Cambiar el recorrido</button></>}
        {estimate && <div className="cinema-choices">{estimate.options.map(option => <button key={option.id} type="button" aria-pressed={rideId === option.id} className={`cinema-pick${rideId === option.id ? ' selected' : ''}`} onClick={() => setRideId(option.id)}>
          <span className="cinema-pick-icon"><Car size={21}/></span>
          <span className="cinema-pick-copy"><strong>{option.label} · {formatPrice(option.price)}</strong><small>Llega en {minutes(option.pickupMinutes)}. {option.detail}.</small></span>
          {rideId === option.id && <span className="selected-indicator" aria-hidden="true">Elegido</span>}
        </button>)}</div>}
        {estimate && <button className="primary-button full-button" disabled={!ride} onClick={next}><span>Continuar</span><ArrowRight size={19}/></button>}
      </section>
    </>}

    {!editor && step === 'review' && !ride && <section className="form-card" style={{ marginTop: 18 }}>{estimateError ? <><StatusMessage kind="error">{estimateError}</StatusMessage><button className="secondary-button full-button" onClick={() => setStep('options')}>Volver a elegir</button></> : <StatusMessage kind="loading">Actualizando el precio de tu viaje…</StatusMessage>}</section>}
    {!editor && step === 'review' && origin && destination && ride && <>
      <div className="flow-heading"><h1>Revisemos antes de continuar</h1><p>Este es el viaje que elegiste.</p></div>
      <section className="confirm-card"><div className="confirm-icon"><Car size={24}/></div><h2>Tu viaje</h2>
        <div className="confirm-details">
          <ReviewRow label="Desde" value={`${addressLabel(origin)}${origin.name.trim() ? ` · ${origin.address}` : ''}`}/>
          <ReviewRow label="Hasta" value={`${addressLabel(destination)}${destination.name.trim() ? ` · ${destination.address}` : ''}`}/>
          <ReviewRow label="Tipo de viaje" value={ride.label}/>
          <ReviewRow label="Llega en" value={minutes(ride.pickupMinutes)}/>
          <ReviewRow label="Precio" value={formatPrice(ride.price)}/>
        </div>
        <p className="cinema-honesty">El precio puede variar un poco según el tránsito.</p>
        {requestError && <StatusMessage kind="error">{requestError}</StatusMessage>}
        <button className="primary-button full-button" disabled={busy} onClick={() => void confirmTrip()}><Car size={19}/> {busy ? 'Pidiendo tu auto…' : 'Pedir el viaje'}</button>
        <button className="secondary-button full-button" onClick={() => setStep('options')}>Cambiar algo</button>
      </section>
    </>}

    {!editor && step === 'done' && trip && <TripTracker trip={trip.trip} state={trip.state} destination={destination ? addressLabel(destination) : ''} busy={busy} error={requestError} onCancel={() => void cancelCurrentTrip()} onSaved={onSaved} onHome={onHome}/>}
    </>}
  </main>;
}

function ReviewRow({ label, value }: { label: string; value: string }) { return <p><span>{label}</span><strong>{value}</strong></p>; }

function TripTracker({ trip, state, destination, busy, error, onCancel, onSaved, onHome }: { trip: Trip; state: TripState; destination: string; busy: boolean; error: string; onCancel: () => void; onSaved: () => void; onHome: () => void }) {
  const title = {
    searching: 'Buscando un conductor cerca tuyo…',
    arriving: `${trip.driver.name.split(' ')[0]} llega en ${minutes(state.minutesToPickup ?? trip.pickupMinutes)}`,
    waiting: 'Tu auto llegó. Te está esperando',
    in_progress: `En viaje · llegás en ${minutes(state.minutesToDestination ?? trip.durationMinutes)}`,
    completed: 'Llegaste a destino',
    cancelled: 'Cancelaste el viaje',
  }[state.status];
  const current = statusOrder.indexOf(state.status);
  const steps = [['searching', 'Buscando conductor'], ['arriving', 'El conductor va a buscarte'], ['waiting', 'El auto llegó'], ['in_progress', 'En viaje'], ['completed', 'Llegaste']] as const;
  const assigned = state.status !== 'searching' && state.status !== 'cancelled';
  const canCancel = state.status === 'searching' || state.status === 'arriving' || state.status === 'waiting';
  const finished = state.status === 'completed' || state.status === 'cancelled';
  return <section className="done-card" style={{ textAlign: 'left' }} aria-live="polite">
    <div className="trip-status">
      <span className="done-check" style={{ margin: 0 }}>{state.status === 'cancelled' ? <X size={28}/> : state.status === 'completed' ? <Check size={28}/> : <Car size={28}/>}</span>
      <h1>{title}</h1>
      {state.status === 'waiting' && <p>Decile al conductor tu PIN antes de subir.</p>}
      {state.status === 'completed' && destination && <p>Llegaste a {destination}. Total: {formatPrice(trip.price)}.</p>}
    </div>
    {state.status === 'in_progress' && <div className="trip-progress" aria-hidden="true"><span style={{ width: `${state.progress ?? 0}%` }}/></div>}
    {assigned && <div className="driver-card">
      <span className="driver-avatar" aria-hidden="true">{trip.driver.name.charAt(0)}</span>
      <div>
        <strong>{trip.driver.name}</strong>
        <small><Star size={13} style={{ verticalAlign: '-2px' }}/> {trip.driver.rating.toLocaleString('es-AR')} · {trip.driver.trips.toLocaleString('es-AR')} viajes</small>
        <div><small>{trip.vehicle.model} {trip.vehicle.color}</small></div>
        <span className="plate" aria-label={`Patente ${trip.vehicle.plate}`}>{trip.vehicle.plate}</span>
      </div>
    </div>}
    {assigned && !finished && <p className="trip-pin">Tu PIN para subir: <strong>{trip.pin}</strong></p>}
    {state.status !== 'cancelled' && <ol className="trip-steps">{steps.map(([key, label], index) =>
      <li key={key} className={index < current || state.status === 'completed' ? 'done' : index === current ? 'current' : ''}><span className="dot">{(index < current || state.status === 'completed') && <Check size={14}/>}</span>{label}</li>)}</ol>}
    <div className="confirm-details">
      <ReviewRow label="Tipo de viaje" value={trip.rideLabel}/>
      <ReviewRow label="Precio" value={formatPrice(trip.price)}/>
    </div>
    {error && <StatusMessage kind="error">{error}</StatusMessage>}
    {canCancel && <button className="secondary-button full-button" disabled={busy} onClick={onCancel}><X size={18}/> {busy ? 'Cancelando…' : 'Cancelar viaje'}</button>}
    <button className={`${finished ? 'primary-button' : 'secondary-button'} full-button`} onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button>
    {finished && <button className="text-button full-button" onClick={onHome}>Volver al inicio</button>}
  </section>;
}
