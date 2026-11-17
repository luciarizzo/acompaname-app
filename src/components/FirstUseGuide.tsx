import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

interface Props {
  onFinish: () => void;
}

interface TourStep {
  title: string;
  description: string;
  desktop: string;
  mobile: string;
}

/** Indicaciones breves sobre la interfaz real; no bloquea ni modifica ningún dato del usuario. */
export const GUIDE_STEPS: TourStep[] = [
  {
    title: 'Podés hablar o escribir',
    description: 'Contanos qué necesitás con tu voz o escribilo acá. También podés elegir una actividad de la lista.',
    desktop: '[data-guide="ask"]',
    mobile: '[data-guide="ask"]',
  },
  {
    title: 'Elegí una actividad',
    description: 'Por ejemplo, buscar una salida, ir al cine o pedir un turno. Tocá la tarjeta de lo que quieras hacer.',
    desktop: '[data-guide="quick"]',
    mobile: '[data-guide="quick"]',
  },
  {
    title: 'Tus gestiones guardadas',
    description: 'En «Mis gestiones» encontrás lo que guardaste. También podés cambiar tus datos en «Mi configuración».',
    desktop: '[data-guide="tasks-desktop"]',
    mobile: '[data-guide="tasks-mobile"]',
  },
  {
    title: 'Hacé la app más cómoda',
    description: 'Acá podés escuchar la pantalla, agrandar el texto y activar el contraste alto. Abrí estas opciones cuando las necesites.',
    desktop: '[data-guide="reading-desktop"]',
    mobile: '[data-guide="reading-mobile"]',
  },
  {
    title: 'Podés pedir ayuda',
    description: 'Con «Llamar» podés comunicarte con una persona de confianza sin perder tu lugar. Listo: ya podés usar Acompáñame.',
    desktop: '[data-guide="trusted-call"]',
    mobile: '[data-guide="trusted-call"]',
  },
];

interface Rect { top: number; bottom: number; left: number; right: number; width: number; height: number }

export function FirstUseGuide({ onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const step = GUIDE_STEPS[index];

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    if (appRoot) appRoot.inert = true;
    dialogRef.current?.focus();
    return () => {
      if (appRoot) appRoot.inert = false;
      previousFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    const getTarget = () => document.querySelector<HTMLElement>(window.matchMedia('(max-width: 650px)').matches ? step.mobile : step.desktop);
    const target = getTarget();
    let frame = 0;
    const position = () => {
      const currentTarget = getTarget();
      if (!currentTarget) { setTargetRect(null); return; }
      const rect = currentTarget.getBoundingClientRect();
      setTargetRect({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height });
    };
    // En pantallas pequeñas la persona ve el control destacado, sin necesitar buscarlo.
    target?.scrollIntoView({ block: index === 2 || index === 3 ? 'nearest' : 'center', behavior: 'auto' });
    frame = window.requestAnimationFrame(position);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [index, step.desktop, step.mobile]);

  const finish = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    onFinish();
  };

  const moveTo = (next: number) => {
    setIndex(next);
    dialogRef.current?.focus();
  };

  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); finish(); return; }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
    if (!buttons.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  const panelHeightEstimate = Math.min(dialogRef.current?.offsetHeight ?? 250, window.innerHeight - 24);
  const cardWidth = Math.min(390, window.innerWidth - 28);
  const gap = 14;
  // En la parte baja de la pantalla el cuadro va arriba; en la cabecera, debajo.
  const below = targetRect ? window.innerHeight - targetRect.bottom > panelHeightEstimate + 20 : false;
  const top = targetRect
    ? below ? targetRect.bottom + gap : Math.max(12, targetRect.top - panelHeightEstimate - gap)
    : Math.max(12, window.innerHeight / 2 - panelHeightEstimate / 2);
  const left = targetRect
    ? Math.max(14, Math.min(targetRect.left, window.innerWidth - cardWidth - 14))
    : Math.max(14, (window.innerWidth - cardWidth) / 2);

  return createPortal(<div className="first-use-guide" aria-label="Guía de primer uso">
    <div className="first-use-guide-backdrop" aria-hidden="true"/>
    {targetRect && <div className="first-use-guide-spotlight" aria-hidden="true" style={{
      top: Math.max(0, targetRect.top - 5),
      left: Math.max(0, targetRect.left - 5),
      width: Math.min(window.innerWidth, targetRect.width + 10),
      height: targetRect.height + 10,
    }}/>}
    <section
      ref={dialogRef}
      className="first-use-guide-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-use-title"
      aria-describedby="first-use-description"
      tabIndex={-1}
      onKeyDown={handleKeys}
      style={{ top: Math.max(10, Math.min(top, window.innerHeight - panelHeightEstimate - 10)), left, width: cardWidth }}
    >
      <div className="first-use-guide-top">
        <span className="first-use-guide-count">Paso {index + 1} de {GUIDE_STEPS.length}</span>
        <button type="button" className="first-use-guide-close" onClick={finish} aria-label="Cerrar la guía"><X size={20}/></button>
      </div>
      <h2 id="first-use-title">{step.title}</h2>
      <p id="first-use-description">{step.description}</p>
      <div className="first-use-guide-controls">
        <button type="button" className="first-use-guide-skip" onClick={finish}>Saltear guía</button>
        <div className="first-use-guide-progress">
          {index > 0 && <button type="button" className="first-use-guide-prev" onClick={() => moveTo(index - 1)}><ArrowLeft size={18}/> Anterior</button>}
          <button type="button" className="first-use-guide-next" onClick={() => index === GUIDE_STEPS.length - 1 ? finish() : moveTo(index + 1)}>
            {index === GUIDE_STEPS.length - 1 ? 'Empezar' : 'Siguiente'} {index < GUIDE_STEPS.length - 1 && <ArrowRight size={18}/>}
          </button>
        </div>
      </div>
    </section>
  </div>, document.body);
}
