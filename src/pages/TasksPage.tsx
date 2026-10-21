import { ArrowLeft, ArrowRight, CalendarHeart, ClipboardList, Theater } from 'lucide-react';
import type { SavedTask } from '../types';
interface Props { items: SavedTask[]; onHome: () => void }
export function TasksPage({ items, onHome }: Props) {
 const icon=(kind:SavedTask['kind'])=>kind==='appointment'?<CalendarHeart size={22}/>:kind==='event'?<Theater size={22}/>:<ClipboardList size={22}/>;
 return <main id="main" className="page tasks-page"><div className="flow-top"><button className="back-button" onClick={onHome}><ArrowLeft size={20}/> Inicio</button></div><div className="flow-heading"><p className="eyebrow">TUS CONSULTAS, EN UN SOLO LUGAR</p><h1>Mis gestiones</h1><p>Acá guardamos las búsquedas que elegiste conservar en este dispositivo.</p></div>
 {items.length===0?<section className="empty-state"><span className="empty-icon"><ClipboardList size={30}/></span><h2>Todavía no hay gestiones guardadas</h2><p>Cuando consultes una salida, una opción de turno u otra gestión, podés guardarla para encontrarla acá.</p><button className="primary-button" onClick={onHome}>Volver al inicio <ArrowRight size={18}/></button></section>:<div className="saved-list">{items.map(item=><article key={item.id} className="saved-card"><span className={`saved-icon ${item.kind}`}>{icon(item.kind)}</span><div className="saved-copy"><h2>{item.title}</h2><p>{item.description}</p><span>{new Date(item.createdAt).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</span></div></article>)}</div>}
 <div className="privacy-footer">Tus gestiones se guardan solo en este dispositivo. No necesitás crear una cuenta.</div></main>;
}
