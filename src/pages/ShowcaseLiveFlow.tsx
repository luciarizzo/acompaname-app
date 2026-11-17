import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, ExternalLink, Search, Film } from 'lucide-react';
import { CinemaDateCalendar } from '../components/CinemaDateCalendar';
import { CinemaLoading } from '../components/CinemaLoading';
import { functionRequest } from '../services/common';
import { formatCinemaDate, ticketAmounts } from '../data/cinemaOptions';
import type { SavedTask } from '../types';
import { saveTask } from '../utils/storage';
import { isAccountMode } from '../utils/storageMode';
import { loadFlowDraft, removeFlowDraft, saveFlowDraft } from '../utils/flowDraft';
import { matchesShowcaseCity } from '../utils/cinemaLocation';
import { showcaseTheaters } from '../data/showcaseTheaters';

type Movie = { id: string; name: string; image?: string };
type Showtime = { id: string; theaterId: string; theater: string; date: string; time: string; format: string; houseId: string };
type Step = 'movie' | 'theater' | 'date' | 'time' | 'tickets' | 'review' | 'done';
type Draft = { step: Step; movieId: string; theaterId: string; date: string; timeId: string; count: string };
const steps: Step[] = ['theater', 'movie', 'date', 'time', 'tickets', 'review', 'done'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const atTheater = (name: string, selected: string) => normalize(name).includes(normalize(selected).replace(/^showcase\s+/, ''));

export function ShowcaseLiveFlow({ city, onBack, onHome, onSaved, onStepChange }: { city: string; onBack: () => void; onHome: () => void; onSaved: () => void; onStepChange: () => void }) {
  const [previous] = useState(() => loadFlowDraft<Draft>('showcase-live'));
  const [resume, setResume] = useState(!!previous && showcaseTheaters.some(item => item.id === previous.theaterId));
  const [step, setStep] = useState<Step>(previous && steps.includes(previous.step) && previous.step !== 'done' && showcaseTheaters.some(item => item.id === previous.theaterId) ? previous.step : 'theater');
  const [movieId, setMovieId] = useState(previous?.movieId || '');
  const [theaterId, setTheaterId] = useState(previous && showcaseTheaters.some(item => item.id === previous.theaterId) ? previous.theaterId : '');
  const [date, setDate] = useState(previous?.date || '');
  const [timeId, setTimeId] = useState(previous?.timeId || '');
  const [count, setCount] = useState(previous?.count || '1');
  const [query, setQuery] = useState('');
  const [showAllTheaters, setShowAllTheaters] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [showtimesLoading, setShowtimesLoading] = useState(false);
  const [moviesError, setMoviesError] = useState('');
  const [showtimesError, setShowtimesError] = useState('');
  const [saved, setSaved] = useState(false);
  const movie = movies.find(x => x.id === movieId);
  const theaters = useMemo(() => [...showcaseTheaters], []);
  const localTheaters = theaters.filter(x => matchesShowcaseCity(city, x.name));
  const visibleTheaters = showAllTheaters ? theaters : localTheaters;
  const theater = theaters.find(x => x.id === theaterId);
  const dates = [...new Set(showtimes.filter(x => theater && atTheater(x.theater, theater.name)).map(x => x.date))].sort();
  const times = showtimes.filter(x => theater && atTheater(x.theater, theater.name) && x.date === date).sort((a,b)=>a.time.localeCompare(b.time));
  const selected = times.find(x => x.id === timeId);
  const index = steps.indexOf(step);
  useEffect(() => { onStepChange(); }, [step]);
  useEffect(() => {
    if (resume) return;
    if (step === 'done' || (step === 'theater' && !theaterId)) { removeFlowDraft('showcase-live'); return; }
    saveFlowDraft('showcase-live', { step, movieId, theaterId, date, timeId, count } satisfies Draft);
  }, [resume, step, movieId, theaterId, date, timeId, count]);
  useEffect(() => {
    if (resume || !theater) { setMovies([]); return; }
    let active = true;
    setMoviesLoading(true); setMoviesError(''); setMovies([]);
    functionRequest<{ movies: Movie[] }>('showcase-live', { action: 'theater-movies', theaterName: theater.name.replace(/^Showcase /, '') })
      .then(result => { if (active) setMovies(result.movies); })
      .catch(err => { if (active) setMoviesError(String(err.message || err)); })
      .finally(() => { if (active) setMoviesLoading(false); });
    return () => { active = false; };
  }, [resume, theaterId]);
  useEffect(() => {
    if (resume || !movieId) return;
    let active = true;
    setShowtimesLoading(true); setShowtimesError(''); setShowtimes([]);
    functionRequest<{ showtimes: Showtime[] }>('showcase-live', { action: 'showtimes', movieId })
      .then(result => { if (active) setShowtimes(result.showtimes); })
      .catch(err => { if (active) setShowtimesError(String(err.message || err)); })
      .finally(() => { if (active) setShowtimesLoading(false); });
    return () => { active = false; };
  }, [resume, movieId]);
  const choose = (label: string, detail: string, chosen: boolean, action: () => void) =>
    <button type="button" aria-pressed={chosen} className={`cinema-pick${chosen ? ' selected' : ''}`} onClick={action}><span className="cinema-pick-copy"><strong>{label}</strong>{detail && <small>{detail}</small>}</span>{chosen && <span className="selected-indicator" aria-hidden="true">Elegido</span>}</button>;
  const busy = step === 'movie' ? moviesLoading : ['date','time'].includes(step) ? showtimesLoading : false;
  const error = step === 'movie' ? moviesError : ['date','time'].includes(step) ? showtimesError : '';
  const allowed = step === 'movie' ? !!movie : step === 'theater' ? !!theater : step === 'date' ? dates.includes(date) : step === 'time' ? !!selected : true;
  const reset = () => { removeFlowDraft('cinema'); removeFlowDraft('showcase-live'); setStep('theater'); setMovieId(''); setTheaterId(''); setDate(''); setTimeId(''); setCount('1'); setResume(false); };
  const save = () => {
    if (!movie || !theater || !selected || saved) return;
    const task: SavedTask = { id: crypto.randomUUID(), kind: 'cinema', title: 'Plan de cine',
      description: `${movie.name} · ${formatCinemaDate(date)} ${selected.time} · ${theater.name} · ${count} entradas · Compra pendiente`,
      createdAt: new Date().toISOString(), mode: 'real' };
    saveTask(task); removeFlowDraft('showcase-live'); setSaved(true); setStep('done');
  };
  return <main id="main" className="page flow-page cinema-flow">
    <div className="flow-top"><button className="back-button" onClick={()=>index === 0 ? onBack() : step === 'done' ? onHome() : setStep(steps[index-1])}><ArrowLeft size={20}/> Volver</button>{step !== 'done' && <button className="home-link" onClick={onHome}>Ir al inicio</button>}</div>
    {resume && <section className="draft-resume"><h2>Tenías una salida al cine sin terminar</h2><p>Podés seguirla o empezar otra.</p><div className="draft-resume-actions"><button className="primary-button" onClick={()=>setResume(false)}>Retomar</button><button className="secondary-button" onClick={reset}>Empezar de nuevo</button></div></section>}
    <div className="flow-progress"><span className="flow-mark"><Clapperboard size={20}/></span><span>Showcase · funciones reales</span><span className="step-label">{step === 'done' ? 'Listo' : step === 'review' ? 'Revisar' : `Paso ${index+1} de 5`}</span></div>
    {!resume && !['review','done'].includes(step) && <>
      <div className="flow-heading"><h1>{({ movie:'¿Qué película querés ver?', theater:'¿En qué Showcase?', date:'¿Qué día querés ir?', time:'¿Qué horario preferís?', tickets:'¿Cuántas entradas?' } as Record<string,string>)[step]}</h1><p>Funciones publicadas por Showcase. Confirmá los datos al comprar.</p></div>
      <section className="form-card">
        {busy && <CinemaLoading message={step === 'movie' ? `Buscando películas con funciones en ${theater?.name}…` : 'Buscando fechas y horarios…'}/>}
        {error && <p role="alert" className="inline-message">{error}</p>}
        {!!error && <p><a href="https://www.todoshowcase.com/" target="_blank" rel="noopener noreferrer">Consultar la cartelera de Showcase <ExternalLink size={15}/></a></p>}
        {step === 'movie' && !busy && !error && !movies.length && <p>No hay películas con funciones publicadas para esta sede en este momento. Podés volver y elegir otro complejo.</p>}
        {step === 'movie' && !busy && <><label htmlFor="showcase-search" className="cinema-search-label">Buscar película</label><div className="cinema-search"><Search size={21} aria-hidden="true"/><input id="showcase-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Escribí parte del título…"/></div><p className="cinema-result-count">{movies.filter(x=>normalize(x.name).includes(normalize(query.trim()))).length} películas encontradas</p><div className="cinema-movie-grid">{movies.filter(x=>normalize(x.name).includes(normalize(query.trim()))).map(x=><button key={x.id} type="button" className={`cinema-movie-card${movieId === x.id ? ' selected' : ''}`} aria-pressed={movieId===x.id} onClick={()=>{setMovieId(x.id);setTheaterId('');setDate('');setTimeId('');}}>{x.image ? <img loading="lazy" src={x.image} alt=""/> : <span className="cinema-movie-placeholder"><Film size={36}/></span>}<span className="cinema-movie-title">{x.name}</span>{movieId===x.id && <span className="cinema-movie-selected">✓ Elegida</span>}</button>)}</div>{movies.length > 0 && !movies.some(x=>normalize(x.name).includes(normalize(query.trim()))) && <p>No encontramos películas con ese título. Probá con otra palabra.</p>}</>}
        {step === 'theater' && <><p className="cinema-result-count">{showAllTheaters ? 'Todos los complejos' : `Complejos de ${city || 'tu zona'}`} · {visibleTheaters.length} resultados</p><div className="cinema-choices cinema-theater-choices">{visibleTheaters.map(x=><div key={x.id}>{choose(x.name,'',theaterId===x.id,()=>{setTheaterId(x.id);setMovieId('');setDate('');setTimeId('');setQuery('');})}</div>)}{!visibleTheaters.length && <p>Showcase no tiene complejos registrados en esta zona.</p>}</div><button type="button" className="text-button cinema-location-toggle" onClick={()=>setShowAllTheaters(value=>!value)}>{showAllTheaters ? 'Mostrar solo mi zona' : 'Ver complejos de otras zonas'}</button></>}
        {step === 'date' && !busy && <CinemaDateCalendar dates={dates} selected={date} onSelect={x=>{setDate(x);setTimeId('');}}/>}
        {step === 'time' && !busy && <div className="cinema-choices">{times.map(x=><div key={x.id}>{choose(x.time,x.format,timeId===x.id,()=>setTimeId(x.id))}</div>)}</div>}
        {step === 'tickets' && <div className="cinema-choices cinema-quantity">{ticketAmounts.map(x=><button key={x} type="button" aria-pressed={count===x} className={`choice-button${count===x?' chosen':''}`} onClick={()=>setCount(x)}>{x} {x==='1'?'entrada':'entradas'}</button>)}</div>}
        <p className="cinema-honesty">La disponibilidad de butacas se consulta durante el pago en Showcase.</p>
        <button className="primary-button full-button" disabled={!allowed||busy||!!error} onClick={()=>setStep(steps[index+1])}>Continuar <ArrowRight size={19}/></button>
      </section>
    </>}
    {!resume && step === 'review' && <><div className="flow-heading"><h1>Tu función Showcase</h1><p>Para elegir las butacas tenés que continuar en el sitio de venta.</p></div><section className="confirm-card"><div className="confirm-icon"><Clapperboard size={24}/></div><h2>{movie?.name}</h2><div className="confirm-details"><p><span>Cine</span><strong>{theater?.name}</strong></p><p><span>Fecha y hora</span><strong>{formatCinemaDate(date)} · {selected?.time}</strong></p><p><span>Formato</span><strong>{selected?.format}</strong></p><p><span>Entradas</span><strong>{count}</strong></p></div><p className="cinema-honesty">No se hizo ninguna reserva o cobro. Verificá la función y las butacas disponibles en el sitio de Showcase.</p>
      {movie && selected && <a className="primary-button full-button" target="_blank" rel="noopener noreferrer" href={`https://entradas.todoshowcase.com/showcase/pelicula?filmid=${encodeURIComponent(movie.id)}&house_id=${encodeURIComponent(selected.houseId)}`}>Elegir butacas y comprar <ExternalLink size={18}/></a>}
      <button className="secondary-button full-button" onClick={save}><Check size={19}/> Guardar plan (sin reservar)</button><button className="text-button" onClick={()=>setStep('time')}>Cambiar horario</button></section></>}
    {!resume && step === 'done' && <section className="done-card"><span className="done-check"><Check size={28}/></span><h1>Plan guardado</h1><p>Falta completar la compra en Showcase.</p>{saved && <div className="inline-message">Guardado {isAccountMode()?'en tu cuenta':'en este dispositivo'}.</div>}<button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button><button className="text-button" onClick={onHome}>Volver al inicio</button></section>}
  </main>;
}
