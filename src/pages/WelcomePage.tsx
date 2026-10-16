import { ArrowRight, Check, ExternalLink, MessageCircle } from 'lucide-react';

interface Props { onContinue: () => void; onSkip: () => void; continueLabel: string }

const steps = [
  'Contanos qué necesitás, con tus palabras o con un botón.',
  'Te mostramos opciones sencillas usando los servicios disponibles.',
  'Antes de salir a otro sitio, te explicamos qué va a pasar.',
];

export function WelcomePage({ onContinue, onSkip, continueLabel }: Props) {
  return <main id="main" className="page welcome-page">
    <div className="welcome-mark" aria-hidden="true"><MessageCircle size={34}/></div>
    <p className="eyebrow">BIENVENIDA</p>
    <h1>Hola, somos Acompáñame</h1>
    <p className="welcome-lead">Te ayudamos a resolver gestiones digitales paso a paso, desde un solo lugar.</p>
    <section className="welcome-card" aria-label="Así funciona Acompáñame">
      <h2>Así funciona</h2>
      <ol>{steps.map((step) => <li key={step}><span className="welcome-check" aria-hidden="true"><Check size={18}/></span><span>{step}</span></li>)}</ol>
      <p className="welcome-transparency"><ExternalLink size={18}/><span>Algunas gestiones continúan en un servicio externo. Siempre te lo vamos a avisar.</span></p>
    </section>
    <p className="welcome-control">Vos elegís qué hacer y confirmás cada paso. No necesitamos tus datos personales para empezar.</p>
    <button className="primary-button full-button welcome-primary" onClick={onContinue}>{continueLabel} <ArrowRight size={20}/></button>
    <button className="welcome-skip" onClick={onSkip}>Ahora no, ir al inicio</button>
  </main>;
}
