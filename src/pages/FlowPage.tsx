import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ExternalLink, MapPin, Search, ShieldCheck, Stethoscope } from 'lucide-react';
import type { AppointmentOption, AppointmentSpecialty, EventResult, EventSearch, FlowKind, SavedTask, SourceMode } from '../types';
import { searchEvents } from '../services/events';
import { StatusMessage } from '../components/StatusMessage';
import { DateSelector } from '../components/DateSelector';
import { saveTask } from '../utils/storage';
import { downloadCalendarFile } from '../utils/calendar';
import { classifyNeed, extractRequestedDate } from '../utils/intent';

interface Props { kind: FlowKind; initialPrompt?: string; city: string; onBack: () => void; onHome: () => void; onSaved: () => void; onStepChange: () => void }
type Step = 'form' | 'loading' | 'results' | 'confirm' | 'done';
type Result = EventResult | AppointmentOption;
const eventCategories = { music: 'Música', theater: 'Teatro', sports: 'Deportes', other: 'Otro tipo de salida' };
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

export function FlowPage({ kind, initialPrompt = '', city: profileCity, onBack, onHome, onSaved, onStepChange }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<SourceMode>('demo');
  const [items, setItems] = useState<Result[]>([]);
  const [selected, setSelected] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);
  const [eventCategory, setEventCategory] = useState<string | null>(classifyNeed(initialPrompt).eventCategory || null);
  const city = profileCity.trim() || 'Mendoza';
  const [eventDate, setEventDate] = useState(() => extractRequestedDate(initialPrompt) || '');
  const [dateFromPrompt, setDateFromPrompt] = useState(() => Boolean(extractRequestedDate(initialPrompt)));
  const [specialty, setSpecialty] = useState<AppointmentSpecialty>('Clínica médica');
  const [need, setNeed] = useState(initialPrompt);

  useEffect(() => { onStepChange(); }, [step]);
  const title = kind === 'event' ? 'Buscar una salida' : kind === 'appointment' ? 'Sacar un turno médico' : 'Otra cosa';
  const resultTitle = kind === 'event' ? 'Algunas opciones para salir' : kind === 'appointment' ? 'Opciones de turno' : 'Una forma de empezar';

  const startSearch = async () => {
    setError('');
    setStep('loading');
    try {
      await new Promise(resolve => window.setTimeout(resolve, 350));
      if (kind === 'event') {
        const result = await searchEvents({ category: eventCategory || 'other', city, date: eventDate } satisfies EventSearch);
        setItems(result.items);
        setMode(result.mode);
      } else if (kind === 'appointment') {
        setItems(demoAppointments(specialty, city));
        setMode('demo');
      } else {
        setItems([]);
        setMode('demo');
      }
      setStep('results');
    } catch (e) {
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
      title: isAppointmentFlow ? 'Consulta de turno médico' : kind === 'event' ? 'Salida consultada' : 'Otra consulta',
      description: appointment ? `${appointment.specialty} · ${appointment.date} · ${appointment.time} · ${appointment.location}` : event ? `${event.name} · ${city}` : need,
      createdAt: new Date().toISOString(),
      mode
    };
    saveTask(task);
    setSaved(true);
  };

  const backStep = () => {
    if (step === 'confirm') { setStep('results'); return; }
    if (step === 'results' || step === 'loading') { setStep('form'); return; }
    onBack();
  };
  const choose = (item: Result) => { setSelected(item); setStep('confirm'); };

  return <main id="main" className="page flow-page">
    <div className="flow-top"><button className="back-button" onClick={backStep}><ArrowLeft size={20}/> Volver</button><button className="home-link" onClick={onHome}>Ir al inicio</button></div>
    <div className="flow-progress"><span className="flow-mark">{kind === 'event' ? '♬' : kind === 'appointment' ? <Stethoscope size={21}/> : '✦'}</span><span>{title}</span><span className="step-label">{step === 'form' ? 'Paso 1 de 2' : step === 'loading' ? 'Preparando…' : step === 'results' ? 'Paso 2 de 2' : step === 'confirm' ? 'Revisar' : 'Listo'}</span></div>

    {step === 'form' && <>
      <div className="flow-heading"><h1>{kind === 'event' ? '¿Qué te gustaría hacer?' : kind === 'appointment' ? '¿Qué tipo de atención buscás?' : 'Contame qué necesitás hacer'}</h1><p>{kind === 'event' ? 'Buscamos actividades usando los servicios disponibles.' : kind === 'appointment' ? 'Elegí una especialidad para ver opciones de turno. Este recorrido no consulta agendas ni hace reservas.' : 'Contame qué necesitás y te ayudo a encontrar una forma sencilla de orientarte.'}</p></div>
      <div className="form-card">
        {kind === 'event' && <>
          <p className="form-intro">Elegí una actividad.</p>
          <div className="choice-grid">{Object.entries(eventCategories).map(([key, value]) => <button key={key} className={eventCategory === key ? 'choice-button chosen' : 'choice-button'} onClick={() => setEventCategory(key)}>{value}{eventCategory === key && <Check size={18}/>}</button>)}</div>
          <div className="privacy-note"><MapPin size={18}/><span>Buscamos salidas en {city}.</span></div>
          <DateSelector value={eventDate} onChange={value => { setEventDate(value); setDateFromPrompt(false); }}/>
          {dateFromPrompt && <p className="date-detected" role="status">Dejé seleccionado el sábado que mencionaste. Podés cambiarlo si querés.</p>}
        </>}
        {kind === 'appointment' && <>
          <div className="privacy-note"><MapPin size={18}/><span>Mostramos sedes en {city}.</span></div>
          <label className="field-label" htmlFor="specialty">Elegí una especialidad</label>
          <select id="specialty" className="form-control" value={specialty} onChange={e => setSpecialty(e.target.value as AppointmentSpecialty)}>{specialties.map(option => <option key={option}>{option}</option>)}</select>
          <div className="privacy-note"><ShieldCheck size={18}/><span>OSDE, PAMI y prestadores médicos son integraciones futuras. Esta demo no envía datos ni confirma un turno real.</span></div>
        </>}
        {kind === 'other' && <>
          <p className="form-intro">Contame qué necesitás hacer y voy a ayudarte a encontrar la forma más sencilla.</p>
          <label className="field-label" htmlFor="other-need">¿Qué necesitás?</label><textarea id="other-need" className="form-control textarea" value={need} onChange={e => setNeed(e.target.value)} placeholder="Por ejemplo: necesito hacer un trámite"/>
          <div className="privacy-note"><ShieldCheck size={18}/><span>No puedo hacer esa gestión directamente todavía, pero puedo ayudarte a encontrar dónde realizarla.</span></div>
        </>}
        {error && <StatusMessage kind="error">{error}</StatusMessage>}
        <button className="primary-button full-button" onClick={() => void startSearch()} disabled={kind === 'event' ? (!eventCategory || !city.trim()) : kind === 'other' ? !need.trim() : false}><Search size={19}/>{kind === 'appointment' ? 'Ver opciones de turno' : 'Buscar opciones'}<ArrowRight size={19}/></button>
      </div>
    </>}

    {step === 'loading' && <section className="loading-panel"><StatusMessage kind="loading">{kind === 'appointment' ? 'Preparando opciones de turno…' : 'Estoy buscando opciones para vos. Puede tardar un momento.'}</StatusMessage><p>Podés esperar en esta pantalla.</p></section>}

    {step === 'results' && <>
      <div className="flow-heading"><h1>{resultTitle}</h1><p>Revisá la información con tranquilidad. Vos elegís cómo seguir.</p></div>
      {mode === 'demo' && <div className="demo-banner"><span className="demo-dot"/> {kind === 'appointment' ? 'Demo · horarios y profesionales de ejemplo. No representan disponibilidad real ni reservan un turno.' : 'Modo demostración · estos datos son de ejemplo y no están actualizados en tiempo real.'}</div>}
      {kind === 'other' ? <div className="results-card other-answer"><span className="result-icon lilac">✦</span><h2>Podemos buscar dónde hacerlo</h2><p>Por ahora no puedo realizar “{need}” directamente. Puedo ayudarte a encontrar una página oficial para continuar.</p><button className="secondary-button" onClick={() => choose({ id: 'other', name: need, date: '', venue: 'Buscador web', url: `https://www.google.com/search?q=${encodeURIComponent(`${need} sitio oficial Argentina`)}` })}>Revisemos antes de continuar <ArrowRight size={18}/></button></div> :
        <div className="results-list">{items.length === 0 ? <div className="empty-results"><h2>No encontré opciones para esta búsqueda</h2><p>Podés cambiar algún dato o volver a intentarlo.</p><button className="secondary-button" onClick={() => setStep('form')}>Cambiar búsqueda</button></div> : items.map(item => isAppointment(item) ? <AppointmentCard key={item.id} item={item} onChoose={() => choose(item)}/> : <EventCard key={item.id} item={item} onChoose={() => choose(item)} demo={mode === 'demo'}/>)}</div>}
      <div className="flow-footer"><button className="secondary-button" onClick={() => setStep('form')}><ArrowLeft size={18}/> Cambiar búsqueda</button><button className="text-button" onClick={onHome}>Volver al inicio</button></div>
    </>}

    {step === 'confirm' && selected && <>
      <div className="flow-heading"><h1>Revisemos antes de continuar</h1><p>Leé el resumen. Todavía podés cambiar algo.</p></div>
      <section className="confirm-card">
        <div className="confirm-icon">{kind === 'event' ? '♬' : kind === 'appointment' ? <Stethoscope size={24}/> : '✦'}</div>
        <h2>{kind === 'appointment' ? 'Revisá los datos del turno' : kind === 'event' ? 'Vas a continuar en el sitio oficial' : 'Vas a buscar información para'}</h2>
        <div className="confirm-details">{kind === 'appointment' && isAppointment(selected) ? <><p><span>Especialidad</span><strong>{selected.specialty}</strong></p><p><span>Profesional</span><strong>{selected.professional}</strong></p><p><span>Fecha y hora</span><strong>{selected.date} · {selected.time}</strong></p><p><span>Sede</span><strong>{selected.location}</strong></p></> : kind === 'event' && !isAppointment(selected) ? <><p><span>Actividad</span><strong>{(selected as EventResult).name}</strong></p><p><span>Fecha</span><strong>{(selected as EventResult).date}</strong></p><p><span>Lugar</span><strong>{(selected as EventResult).venue}</strong></p></> : <p><span>Tu consulta</span><strong>{need}</strong></p>}</div>
        <div className="confirm-honesty">{kind === 'appointment' ? 'Estás viendo información de demostración: el horario no está reservado y no se contactó a la sede. No compartimos tus datos. OSDE, PAMI y prestadores médicos requieren integraciones futuras.' : kind === 'event' && mode === 'demo' ? 'Este evento es de ejemplo. No existe como resultado real y no se abrirá un servicio externo.' : kind === 'event' ? 'La información y cualquier compra se gestionan en el sitio oficial.' : 'La búsqueda se realizará en Google. Acompáñame no completará el trámite.'}</div>
        {kind === 'appointment' || (kind === 'event' && mode === 'demo') ? <button className="primary-button full-button" onClick={() => { save(); setStep('done'); }}><Check size={19}/> {kind === 'appointment' ? 'Guardar consulta' : 'Guardar este ejemplo'}</button> : <a className="primary-button full-button action-link" href={kind === 'event' && !isAppointment(selected) ? selected.url : '#'} target="_blank" rel="noreferrer" onClick={() => { save(); setStep('done'); }}><ExternalLink size={19}/>Abrir sitio oficial<ArrowRight size={19}/></a>}
        {kind === 'event' && mode === 'real' && !isAppointment(selected) && selected.localDate && selected.localTime && <button className="secondary-button full-button" onClick={() => downloadCalendarFile(selected)}><CalendarDays size={18}/> Agregar a mi calendario</button>}
        <button className="secondary-button full-button" onClick={() => setStep('results')}>Cambiar algo</button>
      </section>
    </>}

    {step === 'done' && <section className="done-card"><span className="done-check"><Check size={28}/></span><h1>{kind === 'appointment' ? 'Consulta guardada' : mode === 'demo' ? 'Ejemplo guardado' : kind === 'event' ? 'El sitio oficial se abrió en otra pestaña' : 'La búsqueda se abrió en otra pestaña'}</h1><p>{kind === 'appointment' ? 'Guardamos esta opción en Mis gestiones. El turno no quedó reservado ni confirmado.' : mode === 'demo' ? 'Este ejemplo quedó guardado.' : kind === 'event' ? 'La información de entradas se confirma en el sitio oficial.' : 'Acompáñame no realizó el trámite.'}</p><div className="demo-banner">{saved ? 'Guardado en Mis gestiones.' : ''}</div><button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button><button className="text-button" onClick={onHome}>Volver al inicio</button></section>}
  </main>;
}

function AppointmentCard({ item, onChoose }: { item: AppointmentOption; onChoose: () => void }) {
  return <article className="results-card"><div className="result-topline"><span className="result-type">{item.specialty}</span><Stethoscope size={20}/></div><p className="result-address">{item.professional}</p><p className="result-address">{item.date} · {item.time}</p><p className="result-address">{item.location}</p><button className="small-primary" onClick={onChoose}>Ver opción <ArrowRight size={17}/></button></article>;
}

function EventCard({ item, onChoose, demo }: { item: EventResult; onChoose: () => void; demo: boolean }) {
  return <article className="results-card event-card">{item.image && <img src={item.image} alt=""/>}<div className="event-content"><div className="result-topline"><span className="result-type">{item.name}</span><CalendarDays size={20}/></div><p className="result-address">{item.date}</p><p className="result-address">{item.venue}</p><button className="small-primary" onClick={onChoose}>{demo ? 'Revisar este ejemplo' : 'Ver entrada'} <ArrowRight size={17}/></button></div></article>;
}
