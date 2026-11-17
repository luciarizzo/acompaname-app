import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, ExternalLink, MapPin } from 'lucide-react';
import { DateSelector } from '../components/DateSelector';
import { formatCinemaDate, ticketAmounts } from '../data/cinemaOptions';
import { functionRequest } from '../services/common';
import type { SavedTask } from '../types';
import type { PaymentMethod } from '../utils/profile';
import { saveTask } from '../utils/storage';
import { isAccountMode } from '../utils/storageMode';
import { useBrowserBack } from '../utils/useBrowserBack';
import { loadFlowDraft, removeFlowDraft, saveFlowDraft } from '../utils/flowDraft';

type Step = 'theater' | 'date' | 'movie' | 'time' | 'tickets' | 'review' | 'done';
type Cinema = { id: string; name: string; city: string; address: string; chain: string; website: string | null };
type Session = { id: string; date: string; start: string; auditorium: string; formats: string[]; bookingUrl: string | null; soldOut: boolean };
type Movie = { id: string; title: string; sessions: Session[] };
type Draft = { step: Step; theater: string; date: string; movie: string; time: string; ticketCount: string };
type Props = { city: string; preferredPaymentMethod: PaymentMethod; onPaymentMethodChange: (method: PaymentMethod) => void; onBack: () => void; onHome: () => void; onSaved: () => void; onStepChange: () => void };
const steps: Step[] = ['theater', 'date', 'movie', 'time', 'tickets', 'review', 'done'];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const clock = (value: string) => value.includes('T') ? value.split('T')[1].slice(0, 5) : value.slice(0, 5);

export function CinemaFlow({ city: profileCity, onBack, onHome, onSaved, onStepChange }: Props) {
  const [previous] = useState(() => loadFlowDraft<Draft>('cinema'));
  const [resume, setResume] = useState(!!previous);
  const [step, setStep] = useState<Step>(previous && steps.includes(previous.step) && previous.step !== 'done' ? previous.step : 'theater');
  const [theater, setTheater] = useState(previous?.theater || '');
  const [date, setDate] = useState(previous?.date || today());
  const [movie, setMovie] = useState(previous?.movie || '');
  const [time, setTime] = useState(previous?.time || '');
  const [ticketCount, setTicketCount] = useState(previous?.ticketCount || '1');
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [website, setWebsite] = useState<string | null>(null);
  const [loadingCinemas, setLoadingCinemas] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [cinemaError, setCinemaError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [saved, setSaved] = useState(false);
  const city = profileCity.trim();
  const cinema = cinemas.find(x => x.id === theater);
  const film = movies.find(x => x.id === movie);
  const session = film?.sessions.find(x => x.id === time);
  const bookingUrl = session?.bookingUrl || website || cinema?.website || null;
  const index = steps.indexOf(step);
  useEffect(() => { onStepChange(); }, [step]);
  useEffect(() => {
    if (resume) return;
    if (step === 'done' || (step === 'theater' && !theater)) { removeFlowDraft('cinema'); return; }
    saveFlowDraft('cinema', { step, theater, date, movie, time, ticketCount } satisfies Draft);
  }, [resume, step, theater, date, movie, time, ticketCount]);
  useEffect(() => {
    if (resume || !city) return;
    let active = true;
    setLoadingCinemas(true); setCinemaError('');
    functionRequest<{ cinemas: Cinema[] }>('cinema-catalog', { action: 'cinemas', city })
      .then(result => { if (active) setCinemas(result.cinemas); })
      .catch(err => { if (active) setCinemaError(String(err.message || err)); })
      .finally(() => { if (active) setLoadingCinemas(false); });
    return () => { active = false; };
  }, [city, resume]);
  useEffect(() => {
    if (resume || !theater || !date) return;
    let active = true;
    setLoadingSchedule(true); setScheduleError(''); setMovies([]); setWebsite(null);
    functionRequest<{ movies: Movie[]; cinemaWebsite: string | null }>('cinema-catalog', { action: 'schedule', cinemaId: theater, date })
      .then(result => { if (active) { setMovies(result.movies); setWebsite(result.cinemaWebsite); } })
      .catch(err => { if (active) setScheduleError(String(err.message || err)); })
      .finally(() => { if (active) setLoadingSchedule(false); });
    return () => { active = false; };
  }, [theater, date, resume]);
  const reset = () => { removeFlowDraft('cinema'); setStep('theater'); setTheater(''); setDate(today()); setMovie(''); setTime(''); setTicketCount('1'); setResume(false); };
  const back = () => { if (step === 'done') onHome(); else if (!index) onBack(); else setStep(steps[index - 1]); };
  useBrowserBack(back);
  const choose = (label: string, detail: string, chosen: boolean, action: () => void, disabled = false) =>
    <button type="button" className={`cinema-pick${chosen ? ' selected' : ''}`} aria-pressed={chosen} disabled={disabled} onClick={action}><span className="cinema-pick-copy"><strong>{label}</strong>{detail && <small>{detail}</small>}</span>{chosen && <span className="selected-indicator" aria-hidden="true">Elegido</span>}</button>;
  const busy = step === 'theater' ? loadingCinemas : ['movie','time'].includes(step) ? loadingSchedule : false;
  const error = step === 'theater' ? cinemaError : ['movie','time'].includes(step) ? scheduleError : '';
  const canContinue = step === 'theater' ? !!cinema : step === 'date' ? date >= today() : step === 'movie' ? !!film : step === 'time' ? !!session && !session.soldOut : true;
  const savePlan = () => {
    if (saved || !cinema || !film || !session) return;
    const task: SavedTask = { id: crypto.randomUUID(), kind: 'cinema', title: 'Plan de cine',
      description: `${film.title} · ${formatCinemaDate(date)} · ${clock(session.start)} · ${cinema.name}, ${city} · ${ticketCount} ${ticketCount === '1' ? 'entrada' : 'entradas'} · Compra pendiente en el cine`,
      createdAt: new Date().toISOString(), mode: 'real' };
    saveTask(task); removeFlowDraft('cinema'); setSaved(true); setStep('done');
  };
  return <main id="main" className="page flow-page cinema-flow">
    <div className="flow-top"><button className="back-button" onClick={back}><ArrowLeft size={20}/> Volver</button>{step !== 'done' && <button className="home-link" onClick={onHome}>Ir al inicio</button>}</div>
    {resume && <section className="draft-resume"><h2>Tenías un plan de cine sin terminar</h2><p>Podés retomarlo o comenzar de nuevo. No se compraron entradas.</p><div className="draft-resume-actions"><button className="primary-button" onClick={() => setResume(false)}>Retomar</button><button className="secondary-button" onClick={reset}>Empezar de nuevo</button></div></section>}
    <div className="flow-progress"><span className="flow-mark"><Clapperboard size={20}/></span><span>Ir al cine · cartelera real</span><span className="step-label">{step === 'done' ? 'Listo' : step === 'review' ? 'Revisar' : `Paso ${index + 1} de 5`}</span></div>
    {!resume && step !== 'review' && step !== 'done' && <>
      <div className="flow-heading"><h1>{({ theater: '¿A qué cine te gustaría ir?', date: '¿Qué día querés ir?', movie: '¿Qué película querés ver?', time: '¿Qué función preferís?', tickets: '¿Cuántas entradas necesitás?' } as Record<string,string>)[step]}</h1><p>Cartelera real para {city || 'tu localidad'}. La compra se completa en el sitio del cine.</p></div>
      <section className="form-card">
        {!city && <p className="inline-message">Elegí tu localidad en Configuración para buscar cines.</p>}
        {busy && <p role="status">Consultando cartelera…</p>}
        {error && <p role="alert" className="inline-message">{error}</p>}
        {step === 'theater' && !busy && <div className="cinema-choices">{cinemas.map(x => <div key={x.id}>{choose(x.name, [x.chain,x.address || x.city].filter(Boolean).join(' · '), theater === x.id, () => { setTheater(x.id); setMovie(''); setTime(''); })}</div>)}{!cinemas.length && !error && <p>No encontramos cines de las cadenas integradas en esta localidad.</p>}</div>}
        {step === 'date' && <DateSelector value={date} onChange={value => { setDate(value); setMovie(''); setTime(''); }} optional={false}/>}
        {step === 'movie' && !busy && <div className="cinema-choices">{movies.map(x => <div key={x.id}>{choose(x.title, `${x.sessions.length} funciones`, movie === x.id, () => { setMovie(x.id); setTime(''); })}</div>)}{!movies.length && !error && <p>No hay funciones publicadas para este día. Probá otra fecha.</p>}</div>}
        {step === 'time' && !busy && <div className="cinema-choices">{film?.sessions.map(x => <div key={x.id}>{choose(`${clock(x.start)}${x.soldOut ? ' · Agotada' : ''}`, [x.auditorium,...x.formats].filter(Boolean).join(' · '), time === x.id, () => setTime(x.id), x.soldOut)}</div>)}</div>}
        {step === 'tickets' && <div className="cinema-choices cinema-quantity">{ticketAmounts.map(value => <button key={value} type="button" className={`choice-button${ticketCount === value ? ' chosen' : ''}`} aria-pressed={ticketCount === value} onClick={() => setTicketCount(value)}>{value} {value === '1' ? 'entrada' : 'entradas'}</button>)}</div>}
        <div className="privacy-note"><MapPin size={18}/><span>La información cubre algunas cadenas; confirmá la disponibilidad antes de comprar.</span></div>
        <button className="primary-button full-button" disabled={busy || !!error || !canContinue} onClick={() => setStep(steps[index + 1])}>Continuar <ArrowRight size={19}/></button>
      </section>
    </>}
    {!resume && step === 'review' && <><div className="flow-heading"><h1>Revisemos tu plan</h1><p>Elegí las butacas y pagá desde la web oficial del cine.</p></div><section className="confirm-card"><div className="confirm-icon"><Clapperboard size={24}/></div><h2>Tu salida al cine</h2><div className="confirm-details">
      <p><span>Cine</span><strong>{cinema?.name || 'No disponible'}</strong></p>
      <p><span>Película</span><strong>{film?.title || 'No disponible'}</strong></p>
      <p><span>Fecha y hora</span><strong>{formatCinemaDate(date)} · {session ? clock(session.start) : 'Sin elegir'}</strong></p>
      <p><span>Sala y formato</span><strong>{[session?.auditorium,...(session?.formats || [])].filter(Boolean).join(' · ') || 'No informado'}</strong></p>
      <p><span>Entradas</span><strong>{ticketCount}</strong></p></div>
      <p className="cinema-honesty">Todavía no reservamos asientos ni hicimos ningún cobro. El cine muestra las butacas disponibles durante su proceso de compra.</p>
      {bookingUrl ? <a className="primary-button full-button" href={bookingUrl} target="_blank" rel="noopener noreferrer">Elegir butacas y comprar <ExternalLink size={18}/></a> : <p className="inline-message">Este cine no informó un enlace de venta.</p>}
      <button className="secondary-button full-button" disabled={!cinema || !film || !session} onClick={savePlan}><Check size={19}/> Guardar plan (compra pendiente)</button><button className="text-button" onClick={() => setStep('time')}>Cambiar función</button></section></>}
    {!resume && step === 'done' && <section className="done-card"><span className="done-check"><Check size={28}/></span><h1>Plan guardado</h1><p>Guardado en Mis gestiones. Aún tenés que elegir butacas y pagar en la web del cine.</p>{saved && <div className="inline-message">Guardado {isAccountMode() ? 'en tu cuenta' : 'en este dispositivo'}.</div>}<button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button><button className="text-button" onClick={onHome}>Volver al inicio</button></section>}
  </main>;
}
