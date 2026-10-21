import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, CreditCard, MapPin } from 'lucide-react';
import { DateSelector } from '../components/DateSelector';
import type { SavedTask } from '../types';
import { saveTask } from '../utils/storage';
import type { PaymentMethod } from '../utils/profile';

type Step = 'theater' | 'movie' | 'date' | 'time' | 'seat' | 'tickets' | 'payment' | 'review' | 'done';
type Pick = { id: string; label: string; detail?: string };
const theaters: Pick[] = [
  { id: 'centro', label: 'Cine del Centro', detail: 'En el centro de la ciudad' },
  { id: 'parque', label: 'Cine Parque', detail: 'Una opción cerca de espacios verdes' }
];
const movies: Pick[] = [
  { id: 'viaje', label: 'El viaje inesperado', detail: 'Aventura · 2 h 05 min' },
  { id: 'isla', label: 'La última isla', detail: 'Drama · 1 h 48 min' },
  { id: 'familia', label: 'Una familia especial', detail: 'Comedia · 1 h 35 min' }
];
const times: Pick[] = [
  { id: '17:15', label: '17:15', detail: 'Función de la tarde' },
  { id: '19:30', label: '19:30', detail: 'Función de la tarde' },
  { id: '21:45', label: '21:45', detail: 'Función de la noche' }
];
const seatZones: Pick[] = [
  { id: 'front', label: 'Adelante', detail: 'Más cerca de la pantalla' },
  { id: 'center', label: 'En el centro', detail: 'A una distancia intermedia' },
  { id: 'back', label: 'Al fondo', detail: 'Más lejos de la pantalla' }
];
const paymentOptions: Pick[] = [
  { id: 'debit-card', label: 'Tarjeta de débito' },
  { id: 'credit-card', label: 'Tarjeta de crédito' }
];
const steps: Step[] = ['theater', 'movie', 'date', 'time', 'seat', 'tickets', 'payment', 'review', 'done'];
const stepQuestions: Record<Exclude<Step, 'review' | 'done'>, string> = {
  theater: '¿A qué cine te gustaría ir?', movie: '¿Qué película querés ver?', date: '¿Qué día te gustaría ir?', time: '¿Qué horario preferís?', seat: '¿Dónde preferís sentarte?', tickets: '¿Cuántas entradas necesitás?', payment: '¿Cómo preferís pagar?'
};
function upcomingSaturday() {
  const date = new Date();
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7 || 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function formatDate(value: string) {
  if (!value) return 'Sin elegir';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
}
function selected(list: Pick[], id: string) { return list.find(item => item.id === id); }

interface Props { city: string; preferredPaymentMethod: PaymentMethod; onPaymentMethodChange: (method: PaymentMethod) => void; onBack: () => void; onHome: () => void; onSaved: () => void; onStepChange: () => void }
export function CinemaFlow({ city: profileCity, preferredPaymentMethod, onPaymentMethodChange, onBack, onHome, onSaved, onStepChange }: Props) {
  const [step, setStep] = useState<Step>('theater');
  const [theater, setTheater] = useState('');
  const [movie, setMovie] = useState('');
  const [date, setDate] = useState(upcomingSaturday);
  const [time, setTime] = useState('');
  const [seatZone, setSeatZone] = useState('');
  const [ticketCount, setTicketCount] = useState('1');
  const [payment, setPayment] = useState(preferredPaymentMethod);
  const [saved, setSaved] = useState(false);
  const city = profileCity.trim() || 'Mendoza';
  const stepIndex = steps.indexOf(step);
  useEffect(() => { onStepChange(); }, [step]);

  const back = () => {
    if (step === 'done') { onHome(); return; }
    if (stepIndex === 0) { onBack(); return; }
    setStep(steps[stepIndex - 1]);
  };
  const savePlan = () => {
    if (saved) return;
    const selectedTheater = selected(theaters, theater)?.label || '';
    const selectedMovie = selected(movies, movie)?.label || '';
    const selectedSeat = selected(seatZones, seatZone)?.label || '';
    const selectedPayment = selected(paymentOptions, payment)?.label || '';
    const task: SavedTask = {
      id: crypto.randomUUID(), kind: 'cinema', title: 'Plan de cine',
      description: `${selectedMovie} · ${formatDate(date)} · ${time} · ${selectedTheater}, ${city} · ${ticketCount} ${ticketCount === '1' ? 'entrada' : 'entradas'} · ${selectedSeat} · ${selectedPayment}`,
      createdAt: new Date().toISOString(), mode: 'demo'
    };
    saveTask(task);
    setSaved(true);
    setStep('done');
  };

  return <main id="main" className="page flow-page cinema-flow">
    <div className="flow-top"><button className="back-button" onClick={back}><ArrowLeft size={20}/> {step === 'done' ? 'Inicio' : 'Volver'}</button>{step !== 'done' && <button className="home-link" onClick={onHome}>Ir al inicio</button>}</div>
    <div className="flow-progress"><span className="flow-mark"><Clapperboard size={20}/></span><span>Ir al cine</span><span className="step-label">{step === 'review' ? 'Revisar' : step === 'done' ? 'Listo' : `Paso ${stepIndex + 1} de 7`}</span></div>

    {step !== 'review' && step !== 'done' && <>
      <div className="flow-heading"><h1>{stepQuestions[step]}</h1><p>{step === 'theater' ? `Elegí un cine en ${city}.` : step === 'movie' ? 'Mirá las opciones y elegí con calma.' : step === 'date' ? 'Podés cambiar el día con los selectores.' : step === 'time' ? 'Elegí el horario que te resulte más cómodo.' : step === 'seat' ? 'No hace falta elegir una butaca exacta: alcanza con indicar la zona que preferís.' : step === 'tickets' ? 'Elegí la cantidad de entradas.' : payment ? 'Este medio preferido se usará para las transacciones de Acompáñame. Si elegís otro, actualizamos la preferencia.' : 'Elegí un medio de pago. Quedará como preferido para las transacciones de Acompáñame.'}</p></div>
      <section className="form-card">
        {step === 'theater' && <div className="cinema-choices">{theaters.map(option => <PickButton key={option.id} option={{ ...option, detail: `${option.detail} · ${city}` }} chosen={theater === option.id} onClick={() => setTheater(option.id)}/>)}</div>}
        {step === 'movie' && <div className="cinema-choices">{movies.map(option => <PickButton key={option.id} option={option} chosen={movie === option.id} onClick={() => setMovie(option.id)}/>)}</div>}
        {step === 'date' && <><p className="form-intro">La fecha elegida es <strong>{formatDate(date)}</strong>. Si querés cambiarla, elegí día, mes y año.</p><DateSelector value={date} onChange={setDate} optional={false}/></>}
        {step === 'time' && <div className="cinema-choices">{times.map(option => <PickButton key={option.id} option={option} chosen={time === option.id} onClick={() => setTime(option.id)}/>)}</div>}
        {step === 'seat' && <div className="cinema-choices">{seatZones.map(option => <PickButton key={option.id} option={option} chosen={seatZone === option.id} onClick={() => setSeatZone(option.id)}/>)}</div>}
        {step === 'tickets' && <div className="cinema-choices cinema-quantity">{['1', '2', '3', '4'].map(value => <button key={value} type="button" aria-pressed={ticketCount === value} className={`choice-button${ticketCount === value ? ' chosen' : ''}`} onClick={() => setTicketCount(value)}>{value} {value === '1' ? 'entrada' : 'entradas'}{ticketCount === value && <Check size={19}/>}</button>)}</div>}
        {step === 'payment' && <><div className="cinema-choices">{paymentOptions.map(option => <PickButton key={option.id} option={option} chosen={payment === option.id} onClick={() => { const method = option.id as PaymentMethod; setPayment(method); onPaymentMethodChange(method); }} icon={<CreditCard size={21}/>}/>)}</div><p className="privacy-note"><CreditCard size={18}/><span>Se guarda la preferencia en este dispositivo. No ingreses datos de tarjeta: Acompáñame todavía no procesa pagos.</span></p></>}
        <div className="privacy-note"><MapPin size={18}/><span>{step === 'theater' ? `Tu ciudad es ${city}.` : `Este plan se prepara para ${city}.`}</span></div>
        <button className="primary-button full-button" disabled={step === 'theater' ? !theater : step === 'movie' ? !movie : step === 'time' ? !time : step === 'seat' ? !seatZone : step === 'payment' ? !payment : false} onClick={() => setStep(steps[stepIndex + 1])}><span>Continuar</span><ArrowRight size={19}/></button>
      </section>
    </>}

    {step === 'review' && <>
      <div className="flow-heading"><h1>Revisemos antes de continuar</h1><p>Este es el plan de cine que elegiste.</p></div>
      <section className="confirm-card"><div className="confirm-icon"><Clapperboard size={24}/></div><h2>Tu plan para ir al cine</h2>
        <div className="confirm-details">
          <ReviewRow label="Cine" value={`${selected(theaters, theater)?.label}, ${city}`}/>
          <ReviewRow label="Película" value={selected(movies, movie)?.label || ''}/>
          <ReviewRow label="Día y horario" value={`${formatDate(date)} · ${time}`}/>
          <ReviewRow label="Butacas" value={`${ticketCount} ${ticketCount === '1' ? 'entrada' : 'entradas'} · ${selected(seatZones, seatZone)?.label || ''}`}/>
          <ReviewRow label="Medio preferido" value={selected(paymentOptions, payment)?.label || ''}/>
        </div>
        <p className="cinema-honesty">La disponibilidad y las butacas exactas se confirman directamente con el cine. El medio elegido queda como preferencia para las transacciones de Acompáñame. Esta versión no procesa pagos y no hizo una reserva ni un cobro.</p>
        <button className="primary-button full-button" onClick={savePlan}><Check size={19}/> Guardar mi plan</button>
        <button className="secondary-button full-button" onClick={() => setStep('payment')}>Cambiar algo</button>
      </section>
    </>}

    {step === 'done' && <section className="done-card"><span className="done-check"><Check size={28}/></span><h1>Plan guardado</h1><p>Guardamos tus elecciones en Mis gestiones para que las tengas a mano. La disponibilidad y el pago se confirman directamente con el cine; no se reservó ninguna entrada ni se realizó un cobro.</p>{saved && <div className="inline-message">Tu plan quedó guardado en este dispositivo.</div>}<button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button><button className="text-button" onClick={onHome}>Volver al inicio</button></section>}
  </main>;
}

function PickButton({ option, chosen, onClick, icon }: { option: Pick; chosen: boolean; onClick: () => void; icon?: ReactNode }) {
  return <button type="button" aria-pressed={chosen} className={`cinema-pick${chosen ? ' selected' : ''}`} onClick={onClick}>
    {icon && <span className="cinema-pick-icon">{icon}</span>}<span className="cinema-pick-copy"><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>{chosen && <Check className="cinema-pick-check" size={21}/>}
  </button>;
}
function ReviewRow({ label, value }: { label: string; value: string }) { return <p><span>{label}</span><strong>{value}</strong></p>; }
