import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ExternalLink, LogIn, MapPin, Search, ShieldCheck, Stethoscope } from 'lucide-react';
import type { AppointmentOption, AppointmentSpecialty, EventResult, EventSearch, FlowKind, SavedTask, SourceMode } from '../types';
import { searchEvents } from '../services/events';
import { StatusMessage } from '../components/StatusMessage';
import { DateSelector } from '../components/DateSelector';
import { addLocalTask, saveTask } from '../utils/storage';
import { supabase } from '../services/supabase';
import { searchAppointments } from '../services/appointments';
import { bookAppointment } from '../services/accountData';
import { isAccountMode } from '../utils/storageMode';
import { downloadCalendarFile } from '../utils/calendar';
import { classifyNeed, extractRequestedDate } from '../utils/intent';
import { useBrowserBack } from '../utils/useBrowserBack';
import { loadFlowDraft, saveFlowDraft, removeFlowDraft } from '../utils/flowDraft';

interface Props { kind: Extract<FlowKind, 'event' | 'appointment'>; initialPrompt?: string; city: string; onBack: () => void; onHome: () => void; onSaved: () => void; onStepChange: () => void; onLogin?: () => void }
type Step = 'form' | 'loading' | 'results' | 'confirm' | 'done';
type Result = EventResult | AppointmentOption;
interface SearchDraft { step: Step; eventCategory: string | null; eventDate: string; specialty: AppointmentSpecialty; searchCity?: string; eventQuery?: string }
const eventCategories = { all: 'Todas las actividades', music: 'Música', theater: 'Teatro', sports: 'Deportes', other: 'Otras salidas' };
const specialties: AppointmentSpecialty[] = ['Clínica médica', 'Cardiología', 'Oftalmología', 'Odontología'];
const specialtyCopy: Record<AppointmentSpecialty, string> = {
  'Clínica médica': 'Dra. Paula Ríos',
  Cardiología: 'Dr. Martín López',
  Oftalmología: 'Dra. Laura Acosta',
  Odontología: 'Dr. Andrés Molina'
};
function demoAppointments(specialty: AppointmentSpecialty, city: string): AppointmentOption[] {
  const formatDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  return [
    { id: `demo-${specialty}-1`, specialty, professional: specialtyCopy[specialty], date: formatDate(3), time: '10:30', location: `Consultorio Centro · ${city}` },
    { id: `demo-${specialty}-2`, specialty, professional: specialtyCopy[specialty], date: formatDate(5), time: '16:00', location: `Consultorios Parque · ${city}` }
  ];
}
function isAppointment(item: Result): item is AppointmentOption { return 'specialty' in item; }

export function FlowPage({ kind, initialPrompt = '', city: profileCity, onBack, onHome, onSaved, onStepChange, onLogin }: Props) {
  const [previous] = useState(() => loadFlowDraft<SearchDraft>(kind));
  const [resumePrompt, setResumePrompt] = useState(Boolean(previous));
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<SourceMode>('demo');
  const [items, setItems] = useState<Result[]>([]);
  const [selected, setSelected] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);
  // Turnos reales: hay base configurada (API de turnos). Sin base, se muestran opciones de demostración.
  const [appointmentNotice, setAppointmentNotice] = useState('');
  const [booking, setBooking] = useState<{ code: string; appointment: AppointmentOption } | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const currentRequest = useRef(0);
  const [eventCategory, setEventCategory] = useState<string | null>(() => {
    const initialCategory = previous?.eventCategory ?? classifyNeed(initialPrompt).eventCategory ?? null;
    return initialCategory === 'culture' ? 'all' : initialCategory;
  });
  const city = profileCity.trim() || 'Mendoza';
  const [searchCity, setSearchCity] = useState(() => previous?.searchCity || city);
  const [eventQuery, setEventQuery] = useState(() => previous?.eventQuery || '');
  const [eventSource, setEventSource] = useState('');
  const [eventNotice, setEventNotice] = useState('');
  const [eventAgendaUrl, setEventAgendaUrl] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(() => previous?.eventDate ?? extractRequestedDate(initialPrompt) ?? '');
  const [dateFromPrompt, setDateFromPrompt] = useState(() => Boolean(extractRequestedDate(initialPrompt)));
  const [specialty, setSpecialty] = useState<AppointmentSpecialty>(() => previous?.specialty ?? 'Clínica médica');
  useEffect(() => { onStepChange(); }, [step]);
  useEffect(() => {
    if (resumePrompt) return;
    if (step === 'done') { removeFlowDraft(kind); return; }
    if (step === 'form' && !eventCategory && !eventDate && !eventQuery.trim() && (kind !== 'appointment' || specialty === 'Clínica médica')) { removeFlowDraft(kind); return; }
    saveFlowDraft(kind, { step, eventCategory, eventDate, specialty, searchCity, eventQuery } satisfies SearchDraft);
  }, [kind, step, eventCategory, eventDate, specialty, searchCity, eventQuery, resumePrompt]);
  const discardDraft = () => { removeFlowDraft(kind);setStep('form');setEventCategory(null);setEventDate('');setEventQuery('');setSearchCity(city);setSpecialty('Clínica médica');setResumePrompt(false); };
  const title = kind === 'event' ? 'Buscar una salida' : 'Sacar un turno médico';
  const resultTitle = kind === 'event' ? mode === 'demo' ? 'Ideas para una salida' : 'Algunas opciones para salir' : 'Opciones de turno';

  const startSearch = async () => {
    const request = ++currentRequest.current;
    setError('');
    setStep('loading');
    try {
      await new Promise(resolve => window.setTimeout(resolve, 350));
      if (request !== currentRequest.current) return;
      if (kind === 'event') {
        const result = await searchEvents({ category: eventCategory || 'all', city: searchCity, date: eventDate, query: eventQuery.trim() } satisfies EventSearch);
        if (request !== currentRequest.current) return;
        setItems(result.items);
        setMode(result.mode);
        setEventSource(result.source || '');
        setEventNotice(result.notice || '');
        setEventAgendaUrl(result.agendaUrl || null);
      } else if (supabase) {
        const result = await searchAppointments(specialty, city);
        if (request !== currentRequest.current) return;
        setItems(result.items);
        setMode('real');
        setAppointmentNotice(result.notice || '');
      } else {
        setItems(demoAppointments(specialty, city));
        setMode('demo');
        setAppointmentNotice('');
      }
      setStep('results');
    } catch (e) {
      if (request !== currentRequest.current) return;
      setError(e instanceof Error ? e.message : 'No pude consultar este servicio en este momento. Podemos volver a intentarlo.');
      setStep('form');
    }
  };

  const save = (item: Result | null = selected) => {
    if (saved) return;
    const isAppointmentFlow = kind === 'appointment';
    const event = item && !isAppointment(item) ? item as EventResult : null;
    const appointment = item && isAppointment(item) ? item : null;
    const task: SavedTask = {
      id: crypto.randomUUID(),
      kind,
      title: isAppointmentFlow ? 'Consulta de turno médico' : 'Salida consultada',
      description: appointment ? `${appointment.specialty} · ${appointment.date} · ${appointment.time} · ${appointment.location}` : event ? `${event.name} · ${city}` : '',
      createdAt: new Date().toISOString(),
      mode,
      ...(appointment ? { editChoices: { appointmentSlots: items.filter(isAppointment) } } : {}),
    };
    saveTask(task);
    removeFlowDraft(kind);
    setSaved(true);
  };

  const realAppointments = kind === 'appointment' && mode === 'real';
  // Reserva el horario elegido. El back lo toma solo si sigue libre y lo guarda en Mis gestiones.
  const reserve = async () => {
    if (!selected || !isAppointment(selected) || bookingBusy) return;
    setBookingBusy(true);
    setBookingError('');
    try {
      const result = await bookAppointment(selected.id);
      addLocalTask(result.task);
      removeFlowDraft(kind);
      setSaved(true);
      setBooking({ code: result.code, appointment: result.appointment });
      setStep('done');
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : 'No pudimos reservar el turno. Probá de nuevo.');
    } finally { setBookingBusy(false); }
  };

  const backStep = () => {
    currentRequest.current++;
    if (step === 'confirm') { setStep('results'); return; }
    if (step === 'results' || step === 'loading') { setStep('form'); return; }
    onBack();
  };
  useBrowserBack(backStep);
  const choose = (item: Result) => { setSelected(item); setBookingError(''); setStep('confirm'); };

  return <main id="main" className="page flow-page">
    <div className="flow-top"><button className="back-button" onClick={backStep}><ArrowLeft size={20}/> {step === 'form' ? 'Volver a las opciones' : 'Volver al paso anterior'}</button><button className="home-link" onClick={onHome}>Ir al inicio</button></div>
    {resumePrompt && <section className="draft-resume" aria-label="Retomar consulta">
      <h2>Tenías una consulta sin terminar</h2><p>Conservamos tus elecciones iniciales. Al retomar volveremos a consultar las opciones: no se reservó nada.</p>
      <div className="draft-resume-actions"><button className="primary-button" onClick={() => {setResumePrompt(false);if (previous && previous.step !== 'form') void startSearch();else setStep('form');}}>Retomar consulta</button><button className="secondary-button" onClick={discardDraft}>Empezar de nuevo</button></div>
    </section>}
    <div className="flow-progress"><span className="flow-mark">{kind === 'event' ? '♬' : <Stethoscope size={21}/>}</span><span>{title}</span><span className="step-label">{step === 'form' ? 'Paso 1 de 2' : step === 'loading' ? 'Preparando…' : step === 'results' ? 'Paso 2 de 2' : step === 'confirm' ? 'Revisar' : 'Listo'}</span></div>

    {!resumePrompt && step === 'form' && <>
      <div className="flow-heading"><h1>{kind === 'event' ? '¿Qué te gustaría hacer?' : '¿Qué tipo de atención buscás?'}</h1><p>{kind === 'event' ? 'Buscamos actividades usando los servicios disponibles.' : supabase ? 'Elegí una especialidad y te mostramos los próximos horarios libres.' : 'Elegí una especialidad para ver opciones. Las agendas de los prestadores todavía no están conectadas.'}</p></div>
      <div className="form-card">
        {kind === 'event' && <>
          <p className="form-intro">Primero elegí el tipo de actividad.</p>
          <div className="choice-grid">{Object.entries(eventCategories).map(([key, value]) => <button key={key} className={eventCategory === key ? 'choice-button chosen' : 'choice-button'} onClick={() => { setEventCategory(key); if (eventCategory !== key) setEventQuery(''); }}>{value}{eventCategory === key && <span className="selected-indicator" aria-hidden="true">Elegido</span>}</button>)}</div>
          {eventCategory && <div>
            <label className="field-label" htmlFor="event-query">Buscar por nombre en {eventCategories[eventCategory as keyof typeof eventCategories].toLowerCase()}</label>
            <input id="event-query" type="search" className="form-control" value={eventQuery} maxLength={120} onChange={e => setEventQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && searchCity.trim()) void startSearch(); }} placeholder="Escribí el nombre si ya conocés la actividad (opcional)" autoComplete="off"/>
          </div>}
          <label className="field-label" htmlFor="event-city">Ciudad donde querés buscar actividades</label>
          <input id="event-city" className="form-control" value={searchCity} maxLength={100} onChange={e => setSearchCity(e.target.value)} placeholder="Ej.: Rosario, Córdoba, Mendoza o Buenos Aires"/>
          <div className="privacy-note"><MapPin size={18}/><span>La disponibilidad de eventos reales depende de la agenda oficial de cada ciudad.</span></div>
          <DateSelector value={eventDate} onChange={value => { setEventDate(value); setDateFromPrompt(false); }}/>
          {dateFromPrompt && <p className="date-detected" role="status">Dejé seleccionado el sábado que mencionaste. Podés cambiarlo si querés.</p>}
        </>}
        {kind === 'appointment' && <>
          <div className="privacy-note"><MapPin size={18}/><span>Mostramos sedes en {city}.</span></div>
          <label className="field-label" htmlFor="specialty">Elegí una especialidad</label>
          <select id="specialty" className="form-control" value={specialty} onChange={e => setSpecialty(e.target.value as AppointmentSpecialty)}>{specialties.map(option => <option key={option}>{option}</option>)}</select>
          {!supabase && <div className="privacy-note"><ShieldCheck size={18}/><span>OSDE, PAMI y otros prestadores todavía no están conectados. No compartimos tus datos ni reservamos turnos.</span></div>}
        </>}
        {error && <StatusMessage kind="error">{error}</StatusMessage>}
        <button className="primary-button full-button" onClick={() => void startSearch()} disabled={kind === 'event' && (!eventCategory || !searchCity.trim())}><Search size={19}/>{kind === 'appointment' ? 'Ver opciones de turno' : 'Buscar opciones'}<ArrowRight size={19}/></button>
      </div>
    </>}

    {!resumePrompt && step === 'loading' && <section className="loading-panel"><StatusMessage kind="loading">{kind === 'appointment' ? 'Preparando opciones de turno…' : 'Estoy buscando opciones para vos. Puede tardar un momento.'}</StatusMessage><p>Podés esperar en esta pantalla.</p></section>}

    {!resumePrompt && step === 'results' && <>
      <div className="flow-heading"><h1>{resultTitle}</h1><p>Revisá la información con tranquilidad. Vos elegís cómo seguir.</p>{eventSource && <p>Fuente: {eventSource}.</p>}{eventNotice && <p role="status">{eventNotice}</p>}{appointmentNotice && <p role="status">{appointmentNotice}</p>}{realAppointments && items.length > 0 && <p>Estos son los próximos horarios libres. Tocá el que te quede mejor.</p>}</div>
      <div className="results-list">{items.length === 0 ? <div className="empty-results"><h2>No encontré opciones para esta búsqueda</h2><p>Podés cambiar algún dato o volver a intentarlo.</p>{kind === 'event' && eventAgendaUrl && <p><a href={eventAgendaUrl} target="_blank" rel="noreferrer">Consultar agenda oficial de {searchCity} <ExternalLink size={15}/></a></p>}<button className="secondary-button" onClick={() => setStep('form')}>Cambiar búsqueda</button></div> : items.map(item => isAppointment(item) ? <AppointmentCard key={item.id} item={item} onChoose={() => choose(item)}/> : <EventCard key={item.id} item={item} onChoose={() => choose(item)} demo={mode === 'demo'}/>)}</div>
      <div className="flow-footer"><button className="secondary-button" onClick={() => setStep('form')}><ArrowLeft size={18}/> Cambiar búsqueda</button><button className="text-button" onClick={onHome}>Volver al inicio</button></div>
    </>}

    {!resumePrompt && step === 'confirm' && selected && <>
      <div className="flow-heading"><h1>Revisemos antes de continuar</h1><p>Leé el resumen. Todavía podés cambiar algo.</p></div>
      <section className="confirm-card">
        <div className="confirm-icon">{kind === 'event' ? '♬' : <Stethoscope size={24}/>}</div>
        <h2>{kind === 'appointment' ? 'Revisá los datos del turno' : mode === 'demo' ? 'Vas a guardar esta salida' : 'Vas a continuar en el sitio oficial'}</h2>
        <div className="confirm-details">{kind === 'appointment' && isAppointment(selected) ? <><p><span>Especialidad</span><strong>{selected.specialty}</strong></p><p><span>Profesional</span><strong>{selected.professional}</strong></p><p><span>Fecha y hora</span><strong>{selected.date} · {selected.time}</strong></p><p><span>Sede</span><strong>{selected.location}</strong></p></> : kind === 'event' && !isAppointment(selected) ? <><p><span>Actividad</span><strong>{(selected as EventResult).name}</strong></p><p><span>Fecha</span><strong>{(selected as EventResult).date}</strong></p><p><span>Lugar</span><strong>{(selected as EventResult).venue}</strong></p></> : null}</div>
        <div className="confirm-honesty">{realAppointments ? (isAccountMode() ? 'Al confirmar, el turno queda reservado a tu nombre y te damos un código para mostrar al llegar. Si después no podés ir, lo cancelás desde Mis gestiones.' : 'Para reservar necesitás entrar con tu cuenta. Así el consultorio sabe a nombre de quién está el turno.') : kind === 'appointment' ? 'Este turno todavía no está reservado. Acompáñame aún no está conectado a las agendas de OSDE, PAMI ni otros prestadores. No compartimos tus datos.' : kind === 'event' && mode === 'demo' ? 'Estas ideas te ayudan a organizar la salida. Para asistir a un evento concreto, confirmá fecha, lugar y disponibilidad en su sitio oficial.' : 'La información y cualquier compra se gestionan en el sitio oficial.'}</div>
        {realAppointments && bookingError && <StatusMessage kind="error">{bookingError}</StatusMessage>}
        {realAppointments ? (isAccountMode() ? <>
          <button className="primary-button full-button" disabled={bookingBusy} onClick={() => void reserve()}><Check size={19}/> {bookingBusy ? 'Reservando…' : 'Reservar este turno'}</button>
          {bookingError && <button className="secondary-button full-button" onClick={() => void startSearch()}><Search size={18}/> Ver otros horarios</button>}
        </> : <>
          {onLogin && <button className="primary-button full-button" onClick={onLogin}><LogIn size={19}/> Iniciar sesión para reservar</button>}
          <button className="secondary-button full-button" onClick={() => { save(); setStep('done'); }}>Guardar solo como consulta</button>
        </>) : kind === 'appointment' || (kind === 'event' && mode === 'demo') ? <button className="primary-button full-button" onClick={() => { save(); setStep('done'); }}><Check size={19}/> {kind === 'appointment' ? 'Guardar consulta' : 'Guardar salida'}</button> : <a className="primary-button full-button action-link" href={kind === 'event' && !isAppointment(selected) ? selected.url : !isAppointment(selected) ? selected.url : '#'} target="_blank" rel="noreferrer" onClick={() => { save(); setStep('done'); }}><ExternalLink size={19}/>Abrir sitio oficial<ArrowRight size={19}/></a>}
        {kind === 'event' && mode === 'real' && !isAppointment(selected) && selected.localDate && selected.localTime && <button className="secondary-button full-button" onClick={() => downloadCalendarFile(selected)}><CalendarDays size={18}/> Agregar a mi calendario</button>}
        <button className="secondary-button full-button" onClick={() => setStep('results')}>Cambiar algo</button>
      </section>
    </>}

    {!resumePrompt && step === 'done' && booking && <section className="done-card">
      <span className="done-check"><Check size={28}/></span>
      <h1>¡Turno reservado!</h1>
      <p>Te esperan el <strong>{booking.appointment.date}</strong> a las <strong>{booking.appointment.time}</strong>.</p>
      <div className="confirm-details">
        <p><span>Código del turno</span><strong className="booking-code">{booking.code}</strong></p>
        <p><span>Profesional</span><strong>{booking.appointment.professional}</strong></p>
        <p><span>Sede</span><strong>{booking.appointment.location}</strong></p>
      </div>
      <p>Mostrá el código al llegar. Lo vas a encontrar también en Mis gestiones, donde podés cancelar el turno si no podés ir.</p>
      <button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button><button className="text-button" onClick={onHome}>Volver al inicio</button>
    </section>}
    {!resumePrompt && step === 'done' && !booking && <section className="done-card"><span className="done-check"><Check size={28}/></span><h1>{kind === 'appointment' ? 'Consulta guardada' : mode === 'demo' ? 'Salida guardada' : 'El sitio oficial se abrió en otra pestaña'}</h1><p>{kind === 'appointment' ? 'Guardamos esta opción en Mis gestiones. El turno no quedó reservado ni confirmado.' : mode === 'demo' ? 'Guardamos esta salida en Mis gestiones para que la tengas a mano.' : 'La información de entradas se confirma en el sitio oficial.'}</p><div className="inline-message">{saved ? 'Guardado en Mis gestiones.' : ''}</div><button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button><button className="text-button" onClick={onHome}>Volver al inicio</button></section>}
  </main>;
}

function AppointmentCard({ item, onChoose }: { item: AppointmentOption; onChoose: () => void }) {
  return <article className="results-card"><div className="result-topline"><span className="result-type">{item.specialty} · {item.professional}</span><Stethoscope size={20}/></div><p className="result-address">{item.date} · {item.time}</p><p className="result-address">{item.location}</p><button className="small-primary" onClick={onChoose}>Ver opción <ArrowRight size={17}/></button></article>;
}

function EventCard({ item, onChoose, demo }: { item: EventResult; onChoose: () => void; demo: boolean }) {
  return <article className="results-card event-card">{item.image && <img src={item.image} alt=""/>}<div className="event-content"><div className="result-topline"><span className="result-type">{item.name}</span><CalendarDays size={20}/></div><p className="result-address">{item.date}</p><p className="result-address">{item.venue}</p><button className="small-primary" onClick={onChoose}>{demo ? 'Ver idea' : 'Ver entrada'} <ArrowRight size={17}/></button></div></article>;
}
