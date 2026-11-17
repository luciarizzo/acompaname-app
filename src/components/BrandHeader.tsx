import { ClipboardList, House, Settings, Volume2 } from 'lucide-react';

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
      <div className="header-reading-actions" role="group" aria-label="Opciones para escuchar, cambiar el texto y el contraste" data-guide="reading-controls">
        <button className="icon-action" type="button" onClick={onRead} aria-label={speaking ? 'Detener lectura en voz alta' : 'Escuchar la pantalla'} title={speaking ? 'Detener lectura' : 'Escuchar pantalla'}><Volume2 size={21}/></button>
        <button className="icon-action" type="button" onClick={onText} aria-label="Cambiar tamaño del texto" title="Tamaño del texto"><span className="aa">Aa</span></button>
        <button className="icon-action contrast-action" type="button" onClick={onToggleContrast} aria-pressed={highContrast} aria-label={highContrast ? 'Desactivar contraste alto' : 'Activar contraste alto'} title={highContrast ? 'Desactivar contraste alto' : 'Activar contraste alto'}><span className="contrast-glyph" aria-hidden="true">◐</span></button>
      </div>
    </div>
  </header>;
}
