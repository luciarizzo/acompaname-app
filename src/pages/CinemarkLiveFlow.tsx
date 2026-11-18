import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, ExternalLink, MapPin, Search, Film } from 'lucide-react';
import { CinemaDateCalendar } from '../components/CinemaDateCalendar';
import { CinemaLoading } from '../components/CinemaLoading';
import { functionRequest } from '../services/common';
import { formatCinemaDate, ticketAmounts } from '../data/cinemaOptions';
import type { SavedTask } from '../types';
import { saveTask } from '../utils/storage';
import { isAccountMode } from '../utils/storageMode';
import { loadFlowDraft, removeFlowDraft, saveFlowDraft } from '../utils/flowDraft';
import { cinemarkMovieUrl, cinemarkTheaterQuery, matchesCinemarkCity } from '../utils/cinemaLocation';

type Theater = { id: string; name: string; slug: string; city: string; region: string; address: string };
type Showtime = { id: string; movieId: string; movie: string; date: string; time: string; room: string; format: string; language: string; available: number | null; poster?: string; slug?: string };
type Step = 'theater' | 'movie' | 'date' | 'time' | 'tickets' | 'review' | 'done';
type Draft = { step: Step; theaterId: string; movieId: string; date: string; timeId: string; count: string };
const steps: Step[] = ['theater', 'movie', 'date', 'time', 'tickets', 'review', 'done'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const movieKey = (value: string) => normalize(value).replace(/\s+/g, ' ').trim();
const officialUrl = (slug: string) => { const cinema = cinemarkTheaterQuery(slug); return cinema ? `https://www.cinemark.com.ar/?cine=${encodeURIComponent(cinema)}` : 'https://www.cinemark.com.ar/'; };

export function CinemarkLiveFlow({ city, onBack, onHome, onSaved, onStepChange }: { city: string; onBack: () => void; onHome: () => void; onSaved: () => void; onStepChange: () => void }) {
  const [previous] = useState(() => loadFlowDraft<Draft>('cinemark-live'));
  const [resume, setResume] = useState(!!previous);
  const [step, setStep] = useState<Step>(previous && steps.includes(previous.step) && previous.step !== 'done' ? previous.step : 'theater');
  const [theaterId, setTheaterId] = useState(previous?.theaterId || '');
  const [movieId, setMovieId] = useState(previous?.movieId || '');
  const [date, setDate] = useState(previous?.date || '');
  const [timeId, setTimeId] = useState(previous?.timeId || '');
  const [count, setCount] = useState(previous?.count || '1');
  const [query, setQuery] = useState('');
  const [showAllTheaters, setShowAllTheaters] = useState(false);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [theatersLoading, setTheatersLoading] = useState(true);
  const [showtimesLoading, setShowtimesLoading] = useState(false);
  const [theatersError, setTheatersError] = useState('');
  const [showtimesError, setShowtimesError] = useState('');
  const [saved, setSaved] = useState(false);
  const theater = theaters.find(x => x.id === theaterId);
  // Cinemark devuelve IDs distintos para formatos/variantes de una misma película.
  // La selección representa el título, sin perder las funciones de los otros IDs.
  const availableMovies = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; poster: string; slug: string }>();
    for (const session of showtimes) {
      const key = movieKey(session.movie);
      const previous = grouped.get(key);
      grouped.set(key, { id: key, name: previous?.name || session.movie,
        poster: previous?.poster || session.poster || '', slug: previous?.slug || session.slug || '' });
    }
    return [...grouped.values()];
  }, [showtimes]);
  const dates = useMemo(() => [...new Set(showtimes.filter(x => movieKey(x.movie) === movieId).map(x => x.date))].sort(), [showtimes, movieId]);
  const times = useMemo(() => showtimes.filter(x => movieKey(x.movie) === movieId && x.date === date).sort((a,b) => a.time.localeCompare(b.time)), [showtimes, movieId, date]);
  const selectedMovie = availableMovies.find(x => x.id === movieId);
  const selectedTime = times.find(x => x.id === timeId);
  const index = steps.indexOf(step);
  useEffect(() => { onStepChange(); }, [step]);
  useEffect(() => {
    if (resume) return;
    if (step === 'done' || (step === 'theater' && !theaterId)) { removeFlowDraft('cinemark-live'); return; }
    saveFlowDraft('cinemark-live', { step, theaterId, movieId, date, timeId, count } satisfies Draft);
  }, [resume, step, theaterId, movieId, date, timeId, count]);
  useEffect(() => {
    if (resume) return;
    let active = true;
    setTheatersLoading(true); setTheatersError('');
    functionRequest<{ theaters: Theater[] }>('cinemark-live', { action: 'theaters' })
      .then(result => { if (active) setTheaters(result.theaters); })
      .catch(err => { if (active) setTheatersError(String(err.message || err)); })
      .finally(() => { if (active) setTheatersLoading(false); });
    return () => { active = false; };
  }, [resume]);
  useEffect(() => {
    if (resume || !theaterId) return;
    let active = true;
    setShowtimesLoading(true); setShowtimesError(''); setShowtimes([]);
    functionRequest<{ showtimes: Showtime[] }>('cinemark-live', { action: 'showtimes', theaterId })
      .then(result => { if (active) setShowtimes(result.showtimes); })
      .catch(err => { if (active) setShowtimesError(String(err.message || err)); })
      .finally(() => { if (active) setShowtimesLoading(false); });
    return () => { active = false; };
  }, [resume, theaterId]);
  const localTheaters = theaters.filter(x => matchesCinemarkCity(city, x));
  const filteredTheaters = (showAllTheaters ? theaters : localTheaters).filter(x => {
    const text = normalize([x.name, x.city, x.region, x.address].join(' '));
    return text.includes(normalize(query.trim()));
  }).sort((a,b) => {
    const relevant = (x: Theater) => matchesCinemarkCity(city, x) ? 1 : 0;
    return relevant(b) - relevant(a) || a.name.localeCompare(b.name);
  });
  const choose = (label: string, detail: string, chosen: boolean, action: () => void, disabled = false) =>
    <button type="button" aria-pressed={chosen} disabled={disabled} className={`cinema-pick${chosen ? ' selected' : ''}`} onClick={action}><span className="cinema-pick-copy"><strong>{label}</strong>{detail && <small>{detail}</small>}</span>{chosen && <span className="selected-indicator" aria-hidden="true">Elegido</span>}</button>;
  const busy = step === 'theater' ? theatersLoading : ['movie','date','time'].includes(step) ? showtimesLoading : false;
  const error = step === 'theater' ? theatersError : ['movie','date','time'].includes(step) ? showtimesError : '';
  const allowed = step === 'theater' ? !!theater : step === 'movie' ? !!selectedMovie : step === 'date' ? dates.includes(date) : step === 'time' ? !!selectedTime && selectedTime.available !== 0 : true;
  const reset = () => { removeFlowDraft('cinema'); removeFlowDraft('cinemark-live'); setStep('theater'); setTheaterId(''); setMovieId(''); setDate(''); setTimeId(''); setCount('1'); setResume(false); };
  const save = () => {
    if (!theater || !selectedMovie || !selectedTime || saved) return;
    const task: SavedTask = { id: crypto.randomUUID(), kind: 'cinema', title: 'Plan de cine',
      description: `${selectedMovie.name} · ${formatCinemaDate(date)} ${selectedTime.time} · Cinemark ${theater.name} · ${count} entradas · Compra pendiente`,
      createdAt: new Date().toISOString(), mode: 'real' };
    saveTask(task); removeFlowDraft('cinemark-live'); setSaved(true); setStep('done');
  };
  return <main id="main" className="page flow-page cinema-flow">
    <div className="flow-top"><button className="back-button" onClick={() => index === 0 ? onBack() : step === 'done' ? onHome() : setStep(steps[index-1])}><ArrowLeft size={20}/> Volver</button>{step !== 'done' && <button className="home-link" onClick={onHome}>Ir al inicio</button>}</div>
    {resume && <section className="draft-resume"><h2>Tenías una salida al cine sin terminar</h2><p>Podés retomarla o empezar de nuevo; no reservamos entradas.</p><div className="draft-resume-actions"><button className="primary-button" onClick={() => setResume(false)}>Retomar</button><button className="secondary-button" onClick={reset}>Empezar de nuevo</button></div></section>}
    <div className="flow-progress"><span className="flow-mark"><Clapperboard size={20}/></span><span>Cinemark · funciones reales</span><span className="step-label">{step === 'done' ? 'Listo' : step === 'review' ? 'Revisar' : `Paso ${index+1} de 5`}</span></div>
    {!resume && !['review','done'].includes(step) && <>
      <div className="flow-heading"><h1>{({ theater: 'Elegí un complejo Cinemark', movie: '¿Qué película querés ver?', date: '¿Qué día querés ir?', time: '¿Qué función preferís?', tickets: '¿Cuántas entradas?' } as Record<string,string>)[step]}</h1><p>{step === 'theater' ? 'Primero aparecen complejos cercanos a tu localidad cuando hay coincidencias.' : 'Opciones informadas por Cinemark, sujetas a cambios hasta la compra.'}</p></div>
      <section className="form-card">
        {busy && <CinemaLoading message={step === 'theater' ? 'Buscando complejos disponibles…' : 'Cargando películas y funciones reales…'}/>}
        {error && <p role="alert" className="inline-message">{error}</p>}
        {(!!error || (!busy && step === 'movie' && !availableMovies.length)) && <p><a href="https://www.cinemark.com.ar/" target="_blank" rel="noopener noreferrer">Consultar la cartelera en Cinemark <ExternalLink size={15}/></a></p>}
        {step === 'theater' && !busy && <><label htmlFor="cinemark-search" className="cinema-search-label">Buscar complejo</label><div className="cinema-search"><Search size={21} aria-hidden="true"/><input id="cinemark-search" type="search" value={query} placeholder="Ej.: Palermo, Abasto…" onChange={e=>setQuery(e.target.value)}/></div><p className="cinema-result-count">{showAllTheaters ? 'Todos los complejos' : `Complejos de ${city || 'tu zona'}`} · {filteredTheaters.length} resultados</p><div className="cinema-choices cinema-theater-choices">{filteredTheaters.map(x => <div key={x.id}>{choose(x.name, [x.city,x.address].filter(Boolean).join(' · '), theaterId === x.id, () => { setTheaterId(x.id); setMovieId(''); setDate(''); setTimeId(''); setQuery(''); })}</div>)}</div>{!filteredTheaters.length && <p>No encontramos complejos en esta zona con ese nombre.</p>}<button type="button" className="text-button cinema-location-toggle" onClick={()=>{setShowAllTheaters(value=>!value);setQuery('');}}>{showAllTheaters ? 'Mostrar solo mi zona' : 'Ver complejos de otras zonas'}</button></>}
        {step === 'movie' && !busy && <><label htmlFor="cinemark-movie-search" className="cinema-search-label">Buscar película</label><div className="cinema-search"><Search size={21} aria-hidden="true"/><input id="cinemark-movie-search" type="search" placeholder="Escribí parte del título…" value={query} onChange={e=>setQuery(e.target.value)}/></div><p className="cinema-result-count">{availableMovies.filter(x=>normalize(x.name).includes(normalize(query.trim()))).length} películas encontradas</p><div className="cinema-movie-grid">{availableMovies.filter(x=>normalize(x.name).includes(normalize(query.trim()))).map(x => <button key={x.id} type="button" className={`cinema-movie-card${!x.poster?' no-poster':''}${movieId===x.id?' selected':''}`} aria-pressed={movieId===x.id} onClick={()=>{setMovieId(x.id);setDate('');setTimeId('');}}>{x.poster ? <img loading="lazy" src={x.poster} alt=""/> : <span className="cinema-movie-placeholder"><Film size={36}/></span>}<span className="cinema-movie-title">{x.name}</span>{movieId===x.id && <span className="cinema-movie-selected">✓ Elegida</span>}</button>)}</div>{!availableMovies.length && !error && <p>No hay funciones publicadas en este complejo.</p>}</>}
        {step === 'date' && !busy && <CinemaDateCalendar dates={dates} selected={date} onSelect={x=>{setDate(x);setTimeId('');}}/>}
        {step === 'time' && !busy && <div className="cinema-choices">{times.map(x => <div key={x.id}>{choose(x.time + (x.available === 0 ? ' · Sin lugares' : ''), [x.format,x.language,x.room ? `Sala ${x.room}` : '',x.available !== null ? `${x.available} lugares disponibles` : ''].filter(Boolean).join(' · '), timeId === x.id, () => setTimeId(x.id), x.available === 0)}</div>)}</div>}
        {step === 'tickets' && <div className="cinema-choices cinema-quantity">{ticketAmounts.map(x=><button key={x} type="button" aria-pressed={count === x} className={`choice-button${count === x ? ' chosen' : ''}`} onClick={()=>setCount(x)}>{x} {x === '1' ? 'entrada' : 'entradas'}</button>)}</div>}
        <p className="privacy-note"><MapPin size={18}/> Los horarios y lugares pueden cambiar. La venta se confirma únicamente en Cinemark.</p>
        <button className="primary-button full-button" disabled={!allowed || busy || !!error} onClick={()=>setStep(steps[index+1])}>Continuar <ArrowRight size={19}/></button>
      </section>
    </>}
    {!resume && step === 'review' && <><div className="flow-heading"><h1>Tu función de cine</h1><p>Revisá los datos y seguí al sitio de Cinemark para elegir butacas y pagar.</p></div><section className="confirm-card"><div className="confirm-icon"><Clapperboard size={24}/></div><h2>{selectedMovie?.name}</h2><div className="confirm-details"><p><span>Cine</span><strong>Cinemark {theater?.name}</strong></p><p><span>Fecha y hora</span><strong>{formatCinemaDate(date)} · {selectedTime?.time}</strong></p><p><span>Sala / formato</span><strong>{selectedTime?.room || 'No informada'} · {selectedTime?.format}</strong></p><p><span>Entradas previstas</span><strong>{count}</strong></p></div>
      <p className="cinema-honesty">Esta consulta es informativa. Acompáñame no bloquea butacas ni realiza pagos. <strong>Sede elegida: {theater?.name}.</strong> Al abrir Cinemark, verificá que se mantenga esa sede antes de comprar.</p>
      {theater && selectedMovie && <a href={cinemarkMovieUrl(selectedMovie.name, theater.slug, selectedMovie.slug)} className="primary-button full-button" target="_blank" rel="noopener noreferrer">Ver película y elegir butacas <ExternalLink size={18}/></a>}
      {theater && <a href={officialUrl(theater.slug)} className="text-button" target="_blank" rel="noopener noreferrer">Ver cartelera del complejo <ExternalLink size={16}/></a>}
      <button className="secondary-button full-button" onClick={save}><Check size={19}/> Guardar plan (sin reservar)</button><button className="text-button" onClick={()=>setStep('time')}>Cambiar horario</button></section></>}
    {!resume && step === 'done' && <section className="done-card"><span className="done-check"><Check size={28}/></span><h1>Plan guardado</h1><p>Todavía tenés que confirmar la función, seleccionar las butacas y pagar en Cinemark.</p>{saved && <div className="inline-message">Guardado {isAccountMode() ? 'en tu cuenta' : 'en este dispositivo'}.</div>}<button className="primary-button full-button" onClick={onSaved}>Ir a Mis gestiones <ArrowRight size={18}/></button><button className="text-button" onClick={onHome}>Volver al inicio</button></section>}
  </main>;
}
