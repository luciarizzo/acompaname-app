import { ClipboardList, House, Settings2 } from 'lucide-react';
type Section = 'home' | 'tasks' | 'settings';
interface Props { view: Section | null; onChange: (view: Section) => void }
export function BottomNav({ view, onChange }: Props) {
  return <nav className="bottom-nav" aria-label="Navegación principal">
    <button className={view === 'home' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => onChange('home')} aria-current={view === 'home' ? 'page' : undefined}><House size={22}/><span>Inicio</span></button>
    <button data-guide="tasks-mobile" className={view === 'tasks' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => onChange('tasks')} aria-current={view === 'tasks' ? 'page' : undefined}><ClipboardList size={22}/><span>Mis gestiones</span></button>
    <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => onChange('settings')} aria-current={view === 'settings' ? 'page' : undefined}><Settings2 size={22}/><span>Mi configuración</span></button>
  </nav>;
}
