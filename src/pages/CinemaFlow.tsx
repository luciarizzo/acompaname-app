import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, ExternalLink, MapPin } from 'lucide-react';
import { officialCinemas } from '../data/officialCinemas';
import { CinemarkLiveFlow } from './CinemarkLiveFlow';
import { ShowcaseLiveFlow } from './ShowcaseLiveFlow';
import { ticketAmounts } from '../data/cinemaOptions';
import type { SavedTask } from '../types';
import type { PaymentMethod } from '../utils/profile';
import { saveTask } from '../utils/storage';
import { isAccountMode } from '../utils/storageMode';
import { useBrowserBack } from '../utils/useBrowserBack';
import { loadFlowDraft, removeFlowDraft, saveFlowDraft } from '../utils/flowDraft';

type Step = 'theater' | 'tickets' | 'review' | 'done';
type Draft = { step: Step; theater: string; ticketCount: string };
type Props = { city: string; preferredPaymentMethod: PaymentMethod; onPaymentMethodChange: (method: PaymentMethod) => void; onBack: () => void; onHome: () => void; onSaved: () => void; onStepChange: () => void };
const steps: Step[] = ['theater', 'tickets', 'review', 'done'];

export function CinemaFlow({ city: profileCity, onBack, onHome, onSaved, onStepChange }: Props) {
  const [previous] = useState(() => loadFlowDraft<Draft>('cinema'));
  const [resume, setResume] = useState(Boolean(previous));
  const [step, setStep] = useState<Step>(previous && steps.includes(previous.step) && previous.step !== 'done' ? previous.step : 'theater');
  const [theater, setTheater] = useState(previous?.theater || '');
  const [ticketCount, setTicketCount] = useState(previous?.ticketCount || '1');
  const [saved, setSaved] = useState(false);
  const [cinemarkLive, setCinemarkLive] = useState(false);
  const [showcaseLive, setShowcaseLive] = useState(false);
  const city = profileCity.trim();
  const cinema = officialCinemas.find(option => option.id === theater);
  const index = steps.indexOf(step);

  useEffect(() => { onStepChange(); }, [step]);
  useEffect(() => {
    if (resume) return;
    if (step === 'done' || (step === 'theater' && !theater)) { removeFlowDraft('cinema'); return; }
    saveFlowDraft('cinema', { step, theater, ticketCount } satisfies Draft);
  }, [resume, step, theater, ticketCount]);
  const reset = () => { removeFlowDraft('cinema'); setStep('theater'); setTheater(''); setTicketCount('1'); setResume(false); };
  const back = () => { if (step === 'done') onHome(); else if (!index) onBack(); else setStep(steps[index - 1]); };
  useBrowserBack(back);
  const savePlan = () => {
    if (saved || !cinema) return;
    const task: SavedTask = { id: crypto.randomUUID(), kind: 'cinema', title: 'Plan de cine',
      description: `Consultar ${cinema.name} · ${city || 'Localidad a elegir'} · ${ticketCount} ${ticketCount === '1' ? 'entrada' : 'entradas'} · Película, función, butacas y compra pendientes en la web oficial`,
      createdAt: new Date().toISOString(), mode: 'real' };
    saveTask(task); removeFlowDraft('cinema'); setSaved(true); setStep('done');
  };

  if (cinemarkLive) return <CinemarkLiveFlow city={profileCity} onBack={() => setCinemarkLive(false)} onHome={onHome} onSaved={onSaved} onStepChange={onStepChange}/>;
  if (showcaseLive) return <ShowcaseLiveFlow city={profileCity} onBack={() => setShowcaseLive(false)} onHome={onHome} onSaved={onSaved} onStepChange={onStepChange}/>;

  return <main id="main" className="page flow-page cinema-flow">
    <div className="flow-top"><button className="back-button" onClick={back}><ArrowLeft size={20}/> Volver</button>{step !== 'done' && <button className="home-link" onClick={onHome}>Ir al inicio</button>}</div>
    {resume && <section className="draft-resume"><h2>Tenías un plan de cine sin terminar</h2><p>Podés seguir o empezar de nuevo. Todavía no compraste entradas desde Acompáñame.</p><div className="draft-resume-actions"><button className="primary-button" onClick={() => setResume(false)}>Retomar</button><button className="secondary-button" onClick={reset}>Empezar de nuevo</button></div></section>}
    <div className="flow-progress"><span className="flow-mark"><Clapperboard size={20}/></span><span>Ir al cine · carteleras oficiales</span><span className="step-label">{step === 'done' ? 'Listo' : step === 'review' ? 'Revisar' : `Paso ${index + 1} de 2`}</span></div>
    {!resume && step === 'theater' && <>
      <div className="flow-heading"><h1>¿Qué cadena de cines querés consultar?</h1><p>Elegí una cartelera oficial. Después, en su sitio, seleccioná el complejo cercano a {city || 'tu localidad'}, la película y la función.</p></div>
      <section className="form-card"><div className="cinema-choices">{officialCinemas.map(option =>
        <button key={option.id} type="button" aria-pressed={theater === option.id} className={`cinema-pick${theater === option.id ? ' selected' : ''}`} onClick={() => setTheater(option.id)}>
          <span className="cinema-pick-copy"><strong>{option.name}</strong><small>{option.detail}</small></span>{theater === option.id && <span className="selected-indicator" aria-hidden="true">Elegido</span>}
        </button>)}</div>
        <p className="privacy-note"><MapPin size={18}/> Las cadenas no están disponibles en todas las localidades. La cartelera oficial te permitirá comprobar qué complejos tienen funciones.</p>
        <button className="primary-button full-button" disabled={!cinema} onClick={() => cinema?.id === 'cinemark' ? setCinemarkLive(true) : cinema?.id === 'showcase' ? setShowcaseLive(true) : setStep('tickets')}>Continuar <ArrowRight size={19}/></button>
      </section>
    </>}
    {!resume && step === 'tickets' && <>
      <div className="flow-heading"><h1>¿Cuántas entradas necesitás?</h1><p>Esta cantidad es para organizarte; vas a confirmarla al comprar en el cine.</p></div>
      <section className="form-card"><div className="cinema-choices cinema-quantity">{ticketAmounts.map(value => <button key={value} type="button" aria-pressed={ticketCount === value} className={`choice-button${ticketCount === value ? ' chosen' : ''}`} onClick={() => setTicketCount(value)}>{value} {value === '1' ? 'entrada' : 'entradas'}</button>)}</div>
        <button className="primary-button full-button" onClick={() => setStep('review')}>Continuar <ArrowRight size={19}/></button>
      </section>
    </>}
    {!resume && step === 'review' && <>
      <div className="flow-heading"><h1>Ya podés consultar la cartelera</h1><p>Elegí la película, fecha, horario y butacas desde el sitio oficial.</p></div>
      <section className="confirm-card"><div className="confirm-icon"><Clapperboard size={24}/></div><h2>Tu plan para ir al cine</h2>
        <div className="confirm-details"><p><span>Cadena elegida</span><strong>{cinema?.name || 'Sin elegir'}</strong></p><p><span>Localidad de referencia</span><strong>{city || 'A seleccionar en el cine'}</strong></p><p><span>Entradas previstas</span><strong>{ticketCount}</strong></p></div>
        <p className="cinema-honesty">No consultamos horarios ni disponibilidad de butacas en Acompáñame. Los datos reales se muestran en la cartelera oficial. No se hizo ninguna reserva ni se procesó un pago.</p>
        {cinema && <a className="primary-button full-button" href={cinema.url} target="_blank" rel="noopener noreferrer">Ver cartelera y elegir butacas <ExternalLink size={18}/></a>}
        <button className="secondary-button full-button" onClick={savePlan} disabled={!cinema}><Check size={19}/> Guardar plan (compra pendiente)</button>
        <button className="text-button" onClick={() => setStep('theater')}>Cambiar cine</button>
      </section>
    </>}
    {!resume && step === 'done' && <section className="done-card"><span className="done-check"><Check size={28}/></span><h1>Plan guardado</h1><p>Lo guardamos en Mis gestiones. Acordate de elegir película, función, butacas y pagar en la web del cine.</p>{saved && <div className="inline-message">Guardado {isAccountMode() ? 'en tu cuenta' : 'en este dispositivo'}.</div>}<button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button><button className="text-button" onClick={onHome}>Volver al inicio</button></section>}
  </main>;
}
