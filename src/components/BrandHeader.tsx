import { Volume2 } from 'lucide-react';
interface Props { onHome: () => void; onText: () => void; onRead: () => void; speaking: boolean; highContrast: boolean; onToggleContrast: () => void }
export function BrandHeader({ onHome, onText, onRead, speaking, highContrast, onToggleContrast }: Props) {
  return <header className="topbar">
    <button className="brand" onClick={onHome} aria-label="Ir al inicio · Acompáñame versión 1.0.1"><span className="brand-mark">A</span><span className="brand-identity"><span className="brand-name">Acompáñame</span><span className="brand-version">v1.0.1</span></span></button>
    <div className="top-actions">
      <button className="icon-action" onClick={onRead} aria-label={speaking ? 'Detener lectura' : 'Leer pantalla'} title={speaking ? 'Detener lectura' : 'Leer pantalla'}><Volume2 size={21}/><span className="desktop-label">{speaking ? 'Detener' : 'Escuchar'}</span></button>
      <button className="icon-action" onClick={onText} aria-label="Cambiar tamaño del texto" title="Tamaño del texto"><span className="aa">Aa</span><span className="desktop-label">Texto</span></button>
      <button className="icon-action contrast-action" onClick={onToggleContrast} aria-pressed={highContrast} aria-label="Activar o desactivar contraste alto" title="Contraste alto"><span className="contrast-glyph">◐</span><span className="desktop-label">Contraste</span></button>
    </div>
  </header>;
}
