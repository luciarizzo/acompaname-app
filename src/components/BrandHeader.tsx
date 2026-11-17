import { BookOpenText, ChevronDown, ClipboardList, House, Settings, Volume2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Props {
  onHome: () => void;
  onText: () => void;
  onRead: () => void;
  speaking: boolean;
  highContrast: boolean;
  onToggleContrast: () => void;
  onTasks?: () => void;
  onSettings?: () => void;
  currentSection?: 'home' | 'tasks' | 'settings' | null;
}

export function BrandHeader({ onHome, onText, onRead, speaking, highContrast, onToggleContrast, onTasks, onSettings, currentSection }: Props) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeWhenOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) menuRef.current?.removeAttribute('open');
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !menuRef.current?.open) return;
      menuRef.current.removeAttribute('open');
      menuRef.current.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', closeWhenOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, []);

  const runFromMenu = (action: () => void) => {
    menuRef.current?.removeAttribute('open');
    action();
  };

  return <header className="topbar">
    <button className="brand" type="button" onClick={onHome} aria-label="Ir al inicio · Acompáñame versión 1.0.1">
      <span className="brand-mark">A</span>
      <span className="brand-identity"><span className="brand-name">Acompáñame</span><span className="brand-version">v1.0.1</span></span>
    </button>

    {onTasks && <nav className="header-main-nav" aria-label="Navegación principal de escritorio">
      <button className={`header-nav-item ${currentSection === 'home' ? 'active' : ''}`} type="button" onClick={onHome} aria-current={currentSection === 'home' ? 'page' : undefined}><House size={20}/><span>Inicio</span></button>
      <button data-guide="tasks-desktop" className={`header-nav-item ${currentSection === 'tasks' ? 'active' : ''}`} type="button" onClick={onTasks} aria-current={currentSection === 'tasks' ? 'page' : undefined}><ClipboardList size={20}/><span>Mis gestiones</span></button>
      {onSettings && <button data-guide="settings-desktop" className={`header-nav-item ${currentSection === 'settings' ? 'active' : ''}`} type="button" onClick={onSettings} aria-current={currentSection === 'settings' ? 'page' : undefined}><Settings size={20}/><span>Mi configuración</span></button>}
    </nav>}

    <div className="top-actions">
      <details ref={menuRef} className="desktop-access-menu">
        <summary className="accessibility-trigger" data-guide="reading-desktop" aria-label="Abrir opciones para leer y escuchar: texto, voz y contraste"><BookOpenText size={21}/><span>Leer y escuchar</span><ChevronDown size={17} className="accessibility-chevron"/></summary>
        <div className="accessibility-panel" role="group" aria-label="Opciones para leer y escuchar">
          <p className="accessibility-panel-intro">Elegí cómo querés ver o escuchar la pantalla:</p>
          <button className="accessibility-option" type="button" onClick={() => runFromMenu(onRead)} aria-label={speaking ? 'Detener lectura en voz alta' : 'Escuchar la pantalla'}><Volume2 size={21}/><span>{speaking ? 'Detener lectura' : 'Escuchar pantalla'}</span></button>
          <button className="accessibility-option" type="button" onClick={() => runFromMenu(onText)} aria-label="Cambiar tamaño del texto"><span className="aa">Aa</span><span>Tamaño del texto</span></button>
          <button className="accessibility-option" type="button" onClick={() => runFromMenu(onToggleContrast)} aria-pressed={highContrast} aria-label="Activar o desactivar contraste alto"><span className="contrast-glyph">◐</span><span>{highContrast ? 'Desactivar contraste alto' : 'Activar contraste alto'}</span></button>
        </div>
      </details>
      <div className="mobile-top-actions" data-guide="reading-mobile">
        <button className="icon-action" type="button" onClick={onRead} aria-label={speaking ? 'Detener lectura' : 'Leer pantalla'} title={speaking ? 'Detener lectura' : 'Leer pantalla'}><Volume2 size={21}/></button>
        <button className="icon-action" type="button" onClick={onText} aria-label="Cambiar tamaño del texto" title="Tamaño del texto"><span className="aa">Aa</span></button>
        <button className="icon-action contrast-action" type="button" onClick={onToggleContrast} aria-pressed={highContrast} aria-label="Activar o desactivar contraste alto" title="Contraste alto"><span className="contrast-glyph">◐</span></button>
      </div>
    </div>
  </header>;
}
