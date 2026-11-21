import { ArrowRight, LogIn, MessageCircle, UserPlus } from 'lucide-react';

// Primera pantalla de la app: el usuario elige si entra sin cuenta (como siempre) o con una cuenta.
// "Seguir sin cuenta" lleva a la Bienvenida actual y la app funciona igual que antes, con localStorage.
// "Iniciar sesión" y "Crear cuenta" abren la misma pantalla, con Google o con mail y contraseña.

interface Props { onGuest: () => void; onLogin: () => void; onSignup: () => void }

export function EntryPage({ onGuest, onLogin, onSignup }: Props) {

  return <main id="main" className="page welcome-page">
    <div className="welcome-mark" aria-hidden="true"><MessageCircle size={34}/></div>
    <p className="eyebrow">ACOMPÁÑAME</p>
    <h1>¿Cómo querés entrar?</h1>
    <p className="welcome-lead">Podés usar la app sin cuenta, o con una cuenta para tener tus datos en cualquier celular.</p>
    <button className="primary-button full-button welcome-primary" onClick={onGuest}>Seguir sin cuenta <ArrowRight size={20}/></button>
    <button className="secondary-button full-button" onClick={onLogin}><LogIn size={20}/> Iniciar sesión</button>
    <button className="secondary-button full-button" onClick={onSignup}><UserPlus size={20}/> Crear cuenta</button>
  </main>;
}
