import { useBrowserBack } from '../utils/useBrowserBack';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarHeart, CalendarX, Car, Clapperboard, ClipboardList, Eye, Pencil, Theater, Trash2 } from 'lucide-react';
import { StatusMessage } from '../components/StatusMessage';
import { TaskEditForm } from '../components/TaskEditForm';
import type { SavedTask } from '../types';
import { taskFields, taskStatus } from '../utils/taskDetails';
import { isAccountMode } from '../utils/storageMode';

interface Props { items: SavedTask[]; onHome: () => void; onUpdate: (task: SavedTask) => Promise<void>; onDelete: (id: string) => Promise<void>; onCancelBooking: (task: SavedTask) => Promise<void> }

function TaskIcon({ kind }: { kind: SavedTask['kind'] }) {
  return kind === 'appointment' ? <CalendarHeart size={22}/> : kind === 'cinema' ? <Clapperboard size={22}/> : kind === 'event' ? <Theater size={22}/> : kind === 'trip' ? <Car size={22}/> : <ClipboardList size={22}/>;
}

export function TasksPage({ items, onHome, onUpdate, onDelete, onCancelBooking }: Props) {
  useBrowserBack(onHome);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteTitleRef = useRef<HTMLHeadingElement>(null);
  const deleteOriginRef = useRef<HTMLButtonElement | null>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (pendingDeleteId) deleteTitleRef.current?.focus();
    else if (!notice && deleteOriginRef.current?.isConnected) deleteOriginRef.current.focus();
  }, [pendingDeleteId]);
  useEffect(() => { if (notice) noticeRef.current?.focus(); }, [notice]);
  const confirmDelete = async (item: SavedTask) => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      if (item.booking) await onCancelBooking(item);
      else await onDelete(item.id);
      setPendingDeleteId(null);
      setNotice(item.booking ? 'Cancelaste el turno. El horario quedó libre para otra persona.' : `Eliminaste «${item.title}» de Mis gestiones.`);
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : item.booking ? 'No pudimos cancelar el turno. Intentá de nuevo.' : 'No pudimos eliminar el plan. Intentá de nuevo.');
    } finally { setDeleteBusy(false); }
  };

  return <main id="main" className="page tasks-page">
    <div className="flow-top"><button className="back-button" onClick={onHome}><ArrowLeft size={20}/> Inicio</button></div>
    <div className="flow-heading"><p className="eyebrow">TUS CONSULTAS, EN UN SOLO LUGAR</p><h1>Mis gestiones</h1><p>Acá encontrás los planes y consultas que guardaste {isAccountMode() ? 'en tu cuenta' : 'en este dispositivo'}.</p></div>
    {notice && <p className="saved-notice" role="status" tabIndex={-1} ref={noticeRef}>{notice}</p>}
    {items.length === 0 ? <section className="empty-state"><span className="empty-icon"><ClipboardList size={30}/></span><h2>Todavía no hay gestiones guardadas</h2><p>Cuando consultes una salida, una opción de turno u otra gestión, podés guardarla para encontrarla acá.</p><button className="primary-button" onClick={onHome}>Volver al inicio <ArrowRight size={18}/></button></section>
      : <div className="saved-list">{items.map(item => {
        const expanded = expandedId === item.id;
        if (pendingDeleteId === item.id && item.booking) return <article key={item.id} className="saved-card saved-card-confirming">
          <section className="saved-delete saved-delete-screen" aria-labelledby={`delete-plan-${item.id}`}>
            <h2 id={`delete-plan-${item.id}`} ref={deleteTitleRef} tabIndex={-1}>¿Cancelar este turno?</h2>
            <p>Vas a cancelar el turno <strong>{item.description}</strong>. El horario queda libre para otra persona y no se puede deshacer.</p>
            {deleteError && <StatusMessage kind="error">{deleteError}</StatusMessage>}
            <div className="saved-form-actions"><button type="button" className="secondary-button" disabled={deleteBusy} onClick={() => setPendingDeleteId(null)}>No, mantener turno</button><button type="button" className="saved-delete-button" disabled={deleteBusy} onClick={() => void confirmDelete(item)}><CalendarX size={18}/>{deleteBusy ? 'Cancelando…' : 'Sí, cancelar turno'}</button></div>
          </section>
        </article>;
        if (pendingDeleteId === item.id) return <article key={item.id} className="saved-card saved-card-confirming">
          <section className="saved-delete saved-delete-screen" aria-labelledby={`delete-plan-${item.id}`}>
            <h2 id={`delete-plan-${item.id}`} ref={deleteTitleRef} tabIndex={-1}>¿Eliminar este plan?</h2>
            <p>Vas a quitar <strong>«{item.title}»</strong> de Mis gestiones. Esto no cancela ninguna compra, reserva ni solicitud externa.</p>
            {deleteError && <StatusMessage kind="error">{deleteError}</StatusMessage>}
            <div className="saved-form-actions"><button type="button" className="secondary-button" disabled={deleteBusy} onClick={() => setPendingDeleteId(null)}>Cancelar</button><button type="button" className="saved-delete-button" disabled={deleteBusy} onClick={() => void confirmDelete(item)}><Trash2 size={18}/>{deleteBusy ? 'Eliminando…' : 'Sí, eliminar plan'}</button></div>
          </section>
        </article>;
        return <article key={item.id} className="saved-card saved-card-detailed">
          <span className={`saved-icon ${item.kind}`} aria-hidden="true"><TaskIcon kind={item.kind}/></span>
          <div className="saved-copy">
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            {item.booking && <p className="saved-code">Código para mostrar al llegar: <strong>{item.booking.code}</strong></p>}
            <div className="saved-meta"><span>{new Date(item.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span className={item.booking ? 'saved-state booked' : 'saved-state'}>{item.booking ? 'Turno reservado' : 'Solo guardado'}</span></div>
          </div>
          <div className="saved-card-controls">
            <button type="button" className="secondary-button saved-action saved-detail-toggle" aria-expanded={expanded} aria-controls={expanded ? `task-detail-${item.id}` : undefined} onClick={() => { setExpandedId(expanded ? null : item.id); setEditingId(null); setPendingDeleteId(null); }}><Eye size={18}/>{expanded ? 'Ocultar detalle' : 'Ver detalle'}</button>
            <div className="saved-secondary-controls">
              {!item.booking && <button type="button" className="secondary-button saved-action" aria-label={`Editar ${item.title}`} onClick={() => { setEditingId(item.id); setExpandedId(null); setPendingDeleteId(null); setNotice(''); }}><Pencil size={18}/> Editar</button>}
              <button type="button" className="secondary-button saved-action saved-danger" aria-label={item.booking ? `Cancelar ${item.title}` : `Eliminar ${item.title}`} onClick={event => { deleteOriginRef.current = event.currentTarget; setPendingDeleteId(item.id); setEditingId(null); setExpandedId(null); setDeleteError(''); setNotice(''); }}>{item.booking ? <><CalendarX size={18}/> Cancelar turno</> : <><Trash2 size={18}/> Eliminar</>}</button>
            </div>
          </div>
          {editingId === item.id && <TaskEditForm key={item.id} task={item} onCancel={() => setEditingId(null)} onSave={async updated => { await onUpdate(updated); setEditingId(null); setNotice('Guardaste los cambios del plan.'); }}/>}
          {expanded && <section id={`task-detail-${item.id}`} className="saved-detail" aria-label={`Detalle de ${item.title}`}>
            <h3>Detalle de tu gestión</h3>
            <dl>{[...taskFields(item), ...(item.booking ? [{ label: 'Código del turno', value: item.booking.code }] : [])].map((field, index) => <div key={`${field.label}-${index}`}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
            <p className="saved-honesty">{item.booking ? 'Turno reservado. Si no podés ir, cancelalo para liberar el horario.' : taskStatus(item.kind)}</p>
          </section>}
        </article>;
      })}</div>}
    <div className="privacy-footer">{isAccountMode() ? 'Tus gestiones se guardan en tu cuenta. Podés verlas desde cualquier celular.' : 'Tus gestiones se guardan solo en este celular. Si borrás los datos del navegador o cambiás de celular, se pierden. Para no perderlas, podés entrar con una cuenta.'}</div>
  </main>;
}
