import { useBrowserBack } from '../utils/useBrowserBack';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Lightbulb, Send } from 'lucide-react';
import { StatusMessage } from '../components/StatusMessage';
import { availableFeatures } from '../data/availableFeatures';
import { sendFeatureSuggestion } from '../services/accountData';
import type { FlowKind } from '../types';
import { initialFeatureSuggestion, suggestionError, SUGGESTION_DRAFT_KEY, SUGGESTION_MAX_LENGTH } from '../utils/featureSuggestion';
import { isAccountMode } from '../utils/storageMode';

interface Props {
  initialPrompt?: string;
  onChoose: (kind: Exclude<FlowKind, 'other'>) => void;
  onHome: () => void;
  onLogin: () => void;
}

export function OtherRequestPage({ initialPrompt = '', onChoose, onHome, onLogin }: Props) {
  const [suggestion, setSuggestion] = useState(() => initialFeatureSuggestion(initialPrompt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const signedIn = isAccountMode();
  useBrowserBack(onHome);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const validation = suggestionError(suggestion);
    if (validation) { setError(validation); return; }
    if (!signedIn) {
      try { sessionStorage.setItem(SUGGESTION_DRAFT_KEY, suggestion.trim()); } catch { /* La sugerencia sigue en pantalla. */ }
      onLogin();
      return;
    }
    setBusy(true);
    try {
      await sendFeatureSuggestion(suggestion);
      try { sessionStorage.removeItem(SUGGESTION_DRAFT_KEY); } catch { /* Navegador sin sessionStorage. */ }
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos enviar tu sugerencia. Intentá nuevamente.');
    } finally { setBusy(false); }
  };

  return <main id="main" className="page flow-page other-request-page">
    <div className="flow-top"><button className="back-button" type="button" onClick={onHome}><ArrowLeft size={20}/> Volver al inicio</button></div>
    <div className="flow-heading"><p className="eyebrow">OTRA COSA</p><h1>¿No encontraste lo que necesitás?</h1>
      <p>Estas son las actividades que Acompáñame puede acompañarte a realizar. Elegí una o contanos qué te gustaría que agreguemos.</p></div>

    <section aria-labelledby="other-features-title">
      <h2 id="other-features-title" className="other-section-title">¿Qué podés hacer en Acompáñame?</h2>
      <div className="other-features-grid">{availableFeatures.map(feature => <button type="button" className="other-feature-card" key={feature.kind} onClick={() => onChoose(feature.kind)}>
        <span><strong>{feature.title}</strong><small>{feature.description}</small></span><ArrowRight aria-hidden="true" size={23}/>
      </button>)}</div>
      <p className="suggestion-privacy">Los turnos y las compras se muestran en modo demostración cuando no existe una integración real.</p>
    </section>

    <section className="other-suggestion-card" aria-labelledby="suggestion-title">
      <div className="other-suggestion-heading"><Lightbulb size={24} aria-hidden="true"/><div><h2 id="suggestion-title">¿Te gustaría que la app haga otra cosa?</h2><p>Nos podés proponer una nueva función para futuras versiones.</p></div></div>
      {sent ? <div className="other-suggestion-success" role="status"><Check size={25}/><div><strong>¡Gracias por la sugerencia!</strong><p>La recibimos para tenerla en cuenta. Todavía no está implementada.</p></div></div>
        : <form onSubmit={event => void submit(event)}>
          <label className="field-label" htmlFor="other-suggestion-input">¿Qué te gustaría poder hacer?</label>
          <textarea id="other-suggestion-input" className="form-control textarea" value={suggestion}
            onChange={event => { setSuggestion(event.target.value); if (error) setError(''); }}
            placeholder="Por ejemplo: me gustaría poder consultar horarios de trenes"
            maxLength={SUGGESTION_MAX_LENGTH} rows={3} aria-describedby="suggestion-privacy"/>
          <div className="other-suggestion-info"><span>{suggestion.length} de {SUGGESTION_MAX_LENGTH} caracteres</span><span>Sin nombres, teléfonos ni información privada</span></div>
          {error && <StatusMessage kind="error">{error}</StatusMessage>}
          {!signedIn && <p id="suggestion-privacy" className="suggestion-privacy">Para enviar la sugerencia necesitás iniciar sesión. Tu texto se conservará temporalmente en este navegador al entrar.</p>}
          {signedIn && <p id="suggestion-privacy" className="suggestion-privacy">La sugerencia se guarda en nuestra base de datos para evaluar mejoras. No incluyas datos personales.</p>}
          <button type="submit" className="primary-button full-button" disabled={busy}>{busy ? 'Enviando…' : signedIn ? 'Enviar sugerencia' : 'Iniciar sesión para enviarla'} <Send size={19}/></button>
        </form>}
    </section>
    <button className="text-button other-home-link" type="button" onClick={onHome}>Volver al inicio <ArrowRight size={18}/></button>
  </main>;
}
