import { useState } from 'react';
import { ArrowRight, LogIn, MessageCircle, UserPlus } from 'lucide-react';
import { StatusMessage } from '../components/StatusMessage';

// Primera pantalla de la app: el usuario elige si entra sin cuenta (como siempre) o con una cuenta.
// "Seguir sin cuenta" lleva a la Bienvenida actual y la app funciona igual que antes, con localStorage.
// "Crear cuenta" todavía no está conectado a Supabase.

interface Props { onGuest: () => void; onLogin: () => void }

export function EntryPage({ onGuest, onLogin }: Props) {
  const [notice, setNotice] = useState('');
  const comingSoon = (option: string) => setNotice(`${option} va a estar disponible próximamente. Por ahora podés seguir sin cuenta.`);

  return <main id="main" className="page welcome-page">
    <div className="welcome-mark" aria-hidden="true"><MessageCircle size={34}/></div>
    <p className="eyebrow">ACOMPÁÑAME</p>
    <h1>¿Cómo querés entrar?</h1>
    <p className="welcome-lead">Podés usar la app sin cuenta, o con una cuenta para tener tus datos en cualquier celular.</p>
    <button className="primary-button full-button welcome-primary" onClick={onGuest}>Seguir sin cuenta <ArrowRight size={20}/></button>
    <button className="secondary-button full-button" onClick={onLogin}><LogIn size={20}/> Iniciar sesión</button>
    <button className="secondary-button full-button" onClick={() => comingSoon('Crear una cuenta')}><UserPlus size={20}/> Crear cuenta</button>
    {notice && <div className="full-button"><StatusMessage kind="info">{notice}</StatusMessage></div>}
  </main>;
}
