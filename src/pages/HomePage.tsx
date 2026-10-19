import { useState } from 'react';
import { classifyNeed } from '../utils/intent';
import { ArrowRight, CalendarHeart, Mic, Sparkles, Theater } from 'lucide-react';
import type { FlowKind } from '../types';
interface Props { onSelect: (kind: FlowKind, prompt?: string) => void; largeText: boolean; displayName?: string; onHowItWorks: () => void }
const quickTasks = [
 { kind: 'event' as const, icon: Theater, title: 'Buscar una salida', detail: 'Música, teatro o deportes', color: 'coral' },
 { kind: 'appointment' as const, icon: CalendarHeart, title: 'Sacar un turno médico', detail: 'Ver cómo sería el proceso', color: 'sage' },
 { kind: 'other' as const, icon: Sparkles, title: 'Otra cosa', detail: 'Contame qué necesitás', color: 'lilac' }
];
export function HomePage({ onSelect, largeText, displayName = '', onHowItWorks }: Props) {
 const [prompt, setPrompt] = useState(''); const [listening, setListening] = useState(false); const [voiceMessage, setVoiceMessage] = useState('');
 const startVoice = () => {
  type RecognitionResult = { 0: { transcript: string } };
  type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
  type Recognition = { lang: string; interimResults: boolean; onresult: ((event: RecognitionEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void };
  const w = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const RecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!RecognitionCtor) { setVoiceMessage('Este navegador no permite dictar. Podés escribir lo que necesitás abajo.'); return; }
  const recognition = new RecognitionCtor(); recognition.lang = 'es-AR'; recognition.interimResults = false;
  recognition.onresult = (event) => { const phrase = event.results[0]?.[0]?.transcript || ''; setPrompt(phrase); setVoiceMessage(phrase ? `Te entendí: “${phrase}”` : 'No llegué a escucharte. Podés intentarlo de nuevo o escribirlo.'); setListening(false); };
  recognition.onerror = () => { setVoiceMessage('No pude usar el micrófono. Podés escribir lo que necesitás.'); setListening(false); };
  recognition.onend = () => setListening(false); setListening(true); setVoiceMessage('Te escucho…'); recognition.start();
 };
 const submit = () => { if (prompt.trim()) onSelect(classifyNeed(prompt).kind, prompt.trim()); };
 return <main id="main" className={`page home-page ${largeText ? 'large-text' : ''}`}>
  <div className="home-intro"><p className="eyebrow">A TU RITMO, PASO A PASO</p><h1>Hola{displayName.trim() ? `, ${displayName.trim()}` : ''} <span className="wave" aria-hidden="true">👋</span><br/>¿Qué necesitás hacer hoy?</h1><p className="intro-copy">Contame y buscamos la forma más sencilla de hacerlo.</p></div>
  <section className="ask-card" aria-label="Contanos qué necesitás">
    <div className="voice-row"><div><span className="voice-title">¿Preferís hablar?</span><p>Podés contármelo con tu voz.</p></div><button className={`voice-button ${listening ? 'listening' : ''}`} onClick={startVoice}><Mic size={20}/><span>{listening ? 'Escuchando…' : 'Decímelo con tu voz'}</span></button></div>
    {voiceMessage && <p className="voice-feedback" role="status">{voiceMessage}</p>}
    <div className="input-label"><label htmlFor="need-input">O escribilo con tus palabras</label></div>
    <div className="text-entry"><input id="need-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Quiero hacer algo el sábado" onKeyDown={(e) => e.key === 'Enter' && submit()}/><button className="send-button" aria-label="Continuar con mi pedido" onClick={submit} disabled={!prompt.trim()}><ArrowRight size={21}/></button></div>
  </section>
  <section className="quick-section"><div className="section-heading"><h2>O elegí una opción</h2><span>Empezamos por lo que necesitás</span></div><div className="quick-grid">{quickTasks.map(({kind,icon:Icon,title,detail,color})=><button key={kind} className="quick-card" onClick={()=>onSelect(kind)}><span className={`quick-icon ${color}`}><Icon size={25}/></span><span className="quick-copy"><strong>{title}</strong><small>{detail}</small></span><ArrowRight className="quick-arrow" size={20}/></button>)}</div></section>
  <aside className="trust-note"><span className="trust-check">✓</span><span>Vos decidís cada paso. Acompáñame te explica qué va a pasar antes de continuar. <button className="how-link" onClick={onHowItWorks}>Cómo funciona</button></span></aside>
 </main>;
}
