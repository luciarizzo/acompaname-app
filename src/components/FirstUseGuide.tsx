import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

interface Props {
  onFinish: () => void;
}

interface TourStep {
  title: string;
  description: string;
  mobileDescription?: string;
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
    description: 'En «Mis gestiones» encontrás los planes y las consultas que guardaste.',
    desktop: '[data-guide="tasks-desktop"]',
    mobile: '[data-guide="tasks-mobile"]',
  },
  {
    title: 'Cambiá tu configuración',
    description: 'En «Mi configuración» podés cambiar tus datos y preferencias sin volver a empezar.',
    desktop: '[data-guide="settings-desktop"]',
    mobile: '[data-guide="settings-mobile"]',
  },
  {
    title: 'Leer y escuchar',
    description: 'Tocá «Leer y escuchar» para abrir este menú. Acá te mostramos las tres opciones: escuchar la pantalla, agrandar las letras o activar el contraste alto.',
    mobileDescription: 'Estos tres botones permiten escuchar la pantalla, agrandar las letras y activar el contraste alto.',
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
interface Layout { target: Rect | null; top: number; left: number; width: number }

const SPACING = 16;
const VIEWPORT_MARGIN = 12;
const DESKTOP_READING_STEP = 4;

/** El área iluminada incluye también el menú abierto, no solamente su botón. */
function highlightedRect(target: HTMLElement, showReadingMenu: boolean): Rect {
  const regions = [target.getBoundingClientRect()];
  if (showReadingMenu) {
    const panel = target.closest('details')?.querySelector<HTMLElement>('.accessibility-panel');
    if (panel) regions.push(panel.getBoundingClientRect());
  }
  const left = Math.min(...regions.map(rect => rect.left));
  const top = Math.min(...regions.map(rect => rect.top));
  const right = Math.max(...regions.map(rect => rect.right));
  const bottom = Math.max(...regions.map(rect => rect.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function clamp(value: number, low: number, high: number) {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

/**
 * Ubica la explicación FUERA del elemento iluminado. No usa una altura estimada:
 * el tamaño real de la tarjeta se mide antes de decidir dónde ponerla.
 */
function placeGuide(rect: Rect, cardWidth: number, cardHeight: number, viewportWidth: number, viewportHeight: number): Layout | null {
  const availableWidth = viewportWidth - VIEWPORT_MARGIN * 2;
  const width = Math.min(cardWidth, availableWidth);
  const left = clamp(rect.left, VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);
  const maxTop = viewportHeight - cardHeight - VIEWPORT_MARGIN;

  if (rect.top - cardHeight - SPACING >= VIEWPORT_MARGIN) {
    return { target: rect, top: rect.top - cardHeight - SPACING, left, width };
  }
  if (rect.bottom + cardHeight + SPACING <= viewportHeight - VIEWPORT_MARGIN) {
    return { target: rect, top: rect.bottom + SPACING, left, width };
  }
  // Especialmente útil para el menú «Leer y escuchar» abierto a la derecha.
  if (rect.left - width - SPACING >= VIEWPORT_MARGIN) {
    return { target: rect, top: clamp(rect.top, VIEWPORT_MARGIN, maxTop), left: rect.left - width - SPACING, width };
  }
  if (rect.right + width + SPACING <= viewportWidth - VIEWPORT_MARGIN) {
    return { target: rect, top: clamp(rect.top, VIEWPORT_MARGIN, maxTop), left: rect.right + SPACING, width };
  }
  return null;
}

export function FirstUseGuide({ onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const step = GUIDE_STEPS[index];
  const isMobile = window.matchMedia('(max-width: 650px)').matches;

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

  // Al explicar el menú, lo abrimos solo durante ese paso para enseñar sus opciones.
  useLayoutEffect(() => {
    if (index !== DESKTOP_READING_STEP || isMobile) return;
    const menu = document.querySelector<HTMLDetailsElement>('.desktop-access-menu');
    if (!menu) return;
    menu.open = true;
    return () => { menu.open = false; };
  }, [index, isMobile]);

  useLayoutEffect(() => {
    let frame = 0;
    let attemptedScroll = false;
    const targetSelector = isMobile ? step.mobile : step.desktop;
    const getTarget = () => document.querySelector<HTMLElement>(targetSelector);
    const showMenu = index === DESKTOP_READING_STEP && !isMobile;

    const updatePosition = () => {
      const element = getTarget();
      const card = dialogRef.current;
      if (!card) return;
      const width = Math.min(440, window.innerWidth - 28);
      const height = card.offsetHeight; // Incluye «Anterior», texto grande y contenido del paso.
      if (!element) {
        setLayout({ target: null, top: clamp((window.innerHeight - height) / 2, 10, window.innerHeight - height - 10), left: (window.innerWidth - width) / 2, width });
        return;
      }
      let target = highlightedRect(element, showMenu);
      let placement = placeGuide(target, width, height, window.innerWidth, window.innerHeight);
      if (!placement && !attemptedScroll) {
        attemptedScroll = true;
        // Si no hay espacio arriba ni abajo, subimos el objetivo para poder explicar debajo.
        // Nunca lo ocultamos detrás de la cabecera fija.
        const headerBottom = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0;
        const maximumScroll = Math.max(0, target.top - headerBottom - 8);
        const requiredScroll = Math.max(0, target.bottom + height + SPACING + VIEWPORT_MARGIN - window.innerHeight);
        const distance = Math.min(requiredScroll, maximumScroll);
        if (distance > 0) {
          window.scrollBy({ top: distance, behavior: 'auto' });
          target = highlightedRect(element, showMenu);
          placement = placeGuide(target, width, height, window.innerWidth, window.innerHeight);
        }
      }
      // Degradación para pantallas extremadamente pequeñas, con tarjeta siempre visible.
      const fallback: Layout = {
        target,
        top: clamp(target.bottom + SPACING, VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN),
        left: clamp(target.left, VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
        width,
      };
      const next = placement ?? fallback;
      setLayout(previous => previous && previous.width === next.width && previous.top === next.top && previous.left === next.left &&
        previous.target?.top === next.target?.top && previous.target?.left === next.target?.left &&
        previous.target?.width === next.target?.width && previous.target?.height === next.target?.height ? previous : next);
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePosition);
    };

    // useLayoutEffect posiciona antes del primer dibujo, evitando la superposición inicial.
    updatePosition();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (dialogRef.current) observer?.observe(dialogRef.current);
    const element = getTarget();
    if (element) observer?.observe(element);
    if (showMenu) {
      const panel = element?.closest('details')?.querySelector('.accessibility-panel');
      if (panel) observer?.observe(panel);
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [index, step.desktop, step.mobile, isMobile]);

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


  return createPortal(<div className="first-use-guide" aria-label="Guía de primer uso">
    <div className="first-use-guide-backdrop" aria-hidden="true"/>
    {layout?.target && <div className="first-use-guide-spotlight" aria-hidden="true" style={{
      top: Math.max(0, layout.target.top - 5),
      left: Math.max(0, layout.target.left - 5),
      width: Math.min(window.innerWidth - Math.max(0, layout.target.left - 5), layout.target.width + 10),
      height: layout.target.height + 10,
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
      style={{ top: layout?.top ?? 12, left: layout?.left ?? 14, width: layout?.width ?? Math.min(440, window.innerWidth - 28), visibility: layout ? 'visible' : 'hidden' }}
    >
      <div className="first-use-guide-top">
        <span className="first-use-guide-count">Paso {index + 1} de {GUIDE_STEPS.length}</span>
        <button type="button" className="first-use-guide-close" onClick={finish} aria-label="Cerrar la guía"><X size={20}/></button>
      </div>
      <div className="first-use-guide-step" key={index} aria-live="polite" aria-atomic="true">
        <h2 id="first-use-title">{step.title}</h2>
        <p id="first-use-description">{isMobile ? step.mobileDescription ?? step.description : step.description}</p>
      </div>
      <div className="first-use-guide-steps" aria-hidden="true">
        {GUIDE_STEPS.map((_, stepIndex) => <span key={stepIndex} className={stepIndex <= index ? 'completed' : ''}/>)}
      </div>
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
