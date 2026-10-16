import { ClipboardList, House } from 'lucide-react';
interface Props { view: 'home' | 'tasks'; onChange: (view: 'home' | 'tasks') => void }
export function BottomNav({ view, onChange }: Props) {
 return <nav className="bottom-nav" aria-label="Navegación principal">
  <button className={view === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => onChange('home')} aria-current={view === 'home' ? 'page' : undefined}><House size={22}/><span>Inicio</span></button>
  <button className={view === 'tasks' ? 'nav-item active' : 'nav-item'} onClick={() => onChange('tasks')} aria-current={view === 'tasks' ? 'page' : undefined}><ClipboardList size={22}/><span>Mis gestiones</span></button>
 </nav>
}
