import { useBrowserBack } from '../utils/useBrowserBack';
import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LogIn } from 'lucide-react';
import { StatusMessage } from '../components/StatusMessage';
import { signIn } from '../services/account';

// Pantalla de inicio de sesión con mail y contraseña.
// Los atributos autoComplete permiten que el celular ofrezca guardar y completar la contraseña.

interface Props { onBack: () => void; onSuccess: () => Promise<void>; returnToSuggestion?: boolean }

export function LoginPage({ onBack, onSuccess, returnToSuggestion = false }: Props) {
  useBrowserBack(onBack);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) { setLoading(false); setError(result.error); return; }
    // Mientras se traen el perfil y las gestiones de la base, se sigue mostrando "Iniciando sesión…".
    await onSuccess();
  };

  return <main id="main" className="page flow-page">
    <div className="flow-top"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={20}/> {returnToSuggestion ? 'Volver a mi sugerencia' : 'Volver'}</button></div>
    <div className="flow-heading"><h1>Iniciar sesión</h1><p>Escribí el mail y la contraseña de tu cuenta.</p>{returnToSuggestion && <p>Después vas a poder revisar y enviar tu sugerencia. No se envía automáticamente.</p>}</div>
    <form className="form-card" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <label className="field-label" htmlFor="login-email">Mail</label>
      <input id="login-email" className="form-control" type="email" inputMode="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@gmail.com"/>
      <label className="field-label" htmlFor="login-password">Contraseña</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="login-password" className="form-control" style={{ flex: 1 }} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/>
        <button type="button" className="secondary-button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword}>{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}{showPassword ? 'Ocultar' : 'Ver'}</button>
      </div>
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
      {loading && <StatusMessage kind="loading">Iniciando sesión…</StatusMessage>}
      <button type="submit" className="primary-button full-button" disabled={loading || !email.trim() || !password}><LogIn size={19}/> Entrar</button>
    </form>
  </main>;
}
