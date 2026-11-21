import { useBrowserBack } from '../utils/useBrowserBack';
import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LogIn, MailCheck, UserPlus } from 'lucide-react';
import { StatusMessage } from '../components/StatusMessage';
import { signIn, signInWithGoogle, signUp } from '../services/account';

// Pantalla para entrar o crear una cuenta.
// La forma más simple es «Continuar con Google»: no hay que inventar ni recordar una contraseña.
// También se puede usar mail y contraseña. Los atributos autoComplete permiten que el celular ofrezca guardarla.

export type LoginMode = 'login' | 'signup';
interface Props { onBack: () => void; onSuccess: () => Promise<void>; returnToSuggestion?: boolean; returnToHome?: boolean; initialMode?: LoginMode }

function GoogleIcon() {
  return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>;
}

export function LoginPage({ onBack, onSuccess, returnToSuggestion = false, returnToHome = false, initialMode = 'login' }: Props) {
  useBrowserBack(onBack);
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSentTo, setConfirmationSentTo] = useState('');
  const signup = mode === 'signup';

  const switchMode = (next: LoginMode) => { setMode(next); setError(''); setConfirmationSentTo(''); };

  const submit = async () => {
    setError('');
    setLoading(true);
    if (signup) {
      const result = await signUp(email, password);
      if (result.error) { setLoading(false); setError(result.error); return; }
      if (result.needsConfirmation) { setLoading(false); setConfirmationSentTo(email.trim()); return; }
    } else {
      const result = await signIn(email, password);
      if (result.error) { setLoading(false); setError(result.error); return; }
    }
    // Mientras se traen el perfil y las gestiones de la base, se sigue mostrando el mensaje de carga.
    await onSuccess();
  };

  const google = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    // Si sale bien, el navegador ya está yendo a Google; al volver, la app retoma la sesión sola.
    if (result.error) { setGoogleLoading(false); setError(result.error); }
  };

  const backLabel = returnToSuggestion ? 'Volver a mi sugerencia' : returnToHome ? 'Volver al inicio' : 'Volver';

  if (confirmationSentTo) return <main id="main" className="page flow-page">
    <div className="flow-top"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={20}/> {backLabel}</button></div>
    <section className="done-card">
      <span className="done-check"><MailCheck size={28}/></span>
      <h1>Revisá tu correo</h1>
      <p>Te mandamos un mail a <strong>{confirmationSentTo}</strong>. Abrilo y tocá el botón para activar tu cuenta. Después vas a volver a la app con la sesión iniciada.</p>
      <p>Si no lo ves, buscalo en la carpeta de correo no deseado.</p>
      <button className="secondary-button full-button" type="button" onClick={() => switchMode('login')}>Ya activé mi cuenta</button>
    </section>
  </main>;

  return <main id="main" className="page flow-page">
    <div className="flow-top"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={20}/> {backLabel}</button></div>
    <div className="flow-heading">
      <h1>{signup ? 'Crear una cuenta' : 'Iniciar sesión'}</h1>
      <p>{signup ? 'Con una cuenta, tus datos y turnos te acompañan en cualquier celular.' : 'Entrá con tu cuenta de Google o con tu mail.'}</p>
      {returnToSuggestion && <p>Después vas a poder revisar y enviar tu sugerencia. No se envía automáticamente.</p>}
    </div>
    <div className="form-card">
      <button type="button" className="secondary-button full-button google-button" onClick={() => void google()} disabled={googleLoading || loading}>
        <GoogleIcon/> {googleLoading ? 'Abriendo Google…' : 'Continuar con Google'}
      </button>
      <p className="login-divider"><span>o con tu mail</span></p>
      <form onSubmit={e => { e.preventDefault(); void submit(); }}>
        <label className="field-label" htmlFor="login-email">Mail</label>
        <input id="login-email" className="form-control" type="email" inputMode="email" autoComplete={signup ? 'email' : 'username'} value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@gmail.com"/>
        <label className="field-label" htmlFor="login-password">{signup ? 'Elegí una contraseña' : 'Contraseña'}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="login-password" className="form-control" style={{ flex: 1 }} type={showPassword ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} aria-describedby={signup ? 'password-hint' : undefined}/>
          <button type="button" className="secondary-button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword}>{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}{showPassword ? 'Ocultar' : 'Ver'}</button>
        </div>
        {signup && <p id="password-hint" className="field-hint">Al menos 6 letras o números.</p>}
        {error && <StatusMessage kind="error">{error}</StatusMessage>}
        {loading && <StatusMessage kind="loading">{signup ? 'Creando tu cuenta…' : 'Iniciando sesión…'}</StatusMessage>}
        <button type="submit" className="primary-button full-button" disabled={loading || googleLoading || !email.trim() || (signup ? password.length < 6 : !password)}>
          {signup ? <><UserPlus size={19}/> Crear cuenta</> : <><LogIn size={19}/> Entrar</>}
        </button>
      </form>
      <button type="button" className="text-button full-button" onClick={() => switchMode(signup ? 'login' : 'signup')}>
        {signup ? 'Ya tengo cuenta: iniciar sesión' : '¿No tenés cuenta? Crear una'}
      </button>
    </div>
  </main>;
}
