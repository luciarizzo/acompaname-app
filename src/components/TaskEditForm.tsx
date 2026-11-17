import { useState, type FormEvent } from 'react';
import { Check, Pencil } from 'lucide-react';
import type { SavedTask } from '../types';
import { formatCinemaDate, parseCinemaDate } from '../data/cinemaOptions';
import { appointmentDescription, cinemaFieldChoices, editTaskError, serializeTaskFields, taskFields } from '../utils/taskDetails';
import { DateSelector } from './DateSelector';
import { StatusMessage } from './StatusMessage';
interface Props { task: SavedTask; onSave: (task: SavedTask) => Promise<void>; onCancel: () => void }
export function TaskEditForm({ task, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(task.title);
  const [fields, setFields] = useState(() => taskFields(task));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const slots = task.kind === 'appointment' ? task.editChoices?.appointmentSlots || [] : [];
  const updateField = (index: number, value: string) => setFields(current => current.map((field, i) => i === index ? { ...field, value } : field));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updated: SavedTask = { ...task, title: title.trim(), description: serializeTaskFields(fields) };
    const validationError = editTaskError(task, updated);
    if (validationError) { setError(validationError); return; }
    setBusy(true); setError('');
    try { await onSave(updated); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos guardar los cambios. Intentá de nuevo.'); }
    finally { setBusy(false); }
  };
  return <form className="saved-edit" onSubmit={event => void submit(event)} noValidate>
    <h3><Pencil size={19}/> Editar plan guardado</h3>
    <p>Solo podés elegir opciones del recorrido original. Esto no modifica compras, reservas ni servicios externos.</p>
    <label className="field-label" htmlFor={`task-title-${task.id}`}>Nombre del plan</label>
    <input id={`task-title-${task.id}`} className="form-control" value={title} maxLength={120} onChange={event => setTitle(event.target.value)}/>
    {slots.length > 0 && <fieldset className="saved-slot-options">
      <legend className="field-label">Horarios y sedes ofrecidos al guardar el turno</legend>
      {slots.map(slot => {
        const value = appointmentDescription(slot);
        return <label className="saved-slot-option" key={slot.id}><input type="radio" name={`appointment-${task.id}`} checked={serializeTaskFields(fields) === value} onChange={() => setFields(taskFields({ ...task, description: value }))}/><span><strong>{slot.date} · {slot.time}</strong><small>{slot.location} · {slot.professional}</small></span></label>;
      })}
    </fieldset>}
    {task.kind === 'appointment' && slots.length === 0 && <p className="saved-readonly-note">Esta consulta fue guardada sin registrar las alternativas que se mostraron. Para no inventar horarios o sedes, sus datos se mantienen sin cambios.</p>}
    {task.kind !== 'appointment' && task.kind !== 'cinema' && <p className="saved-readonly-note">Las opciones de este plan dependen de la consulta original. Para cambiarlas, iniciá otra gestión desde el inicio.</p>}
    {fields.map((field, index) => {
      if (task.kind === 'appointment' && slots.length > 0) return null;
      const options = cinemaFieldChoices(task, field.label);
      const canChoose = task.kind === 'cinema' && options.includes(field.value);
      const isoDate = task.kind === 'cinema' && field.label === 'Día' ? parseCinemaDate(field.value) : null;
      const year = isoDate ? Number(isoDate.slice(0,4)) : 0;
      const currentYear = new Date().getFullYear();
      const canEditDate = Boolean(isoDate && year >= currentYear && year <= currentYear + 5);
      return <div key={`${task.id}-${index}`}>
        {canEditDate && isoDate ? <DateSelector value={isoDate} optional={false} onChange={value => { if (value) updateField(index, formatCinemaDate(value)); }}/>:<>
          <label className="field-label" htmlFor={`task-field-${task.id}-${index}`}>{field.label}</label>
          {canChoose ? <select id={`task-field-${task.id}-${index}`} className="form-control" value={field.value} onChange={event => updateField(index, event.target.value)}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
            : <p id={`task-field-${task.id}-${index}`} className="saved-locked-value">{field.value}</p>}
        </>}
      </div>;
    })}
    {error && <StatusMessage kind="error">{error}</StatusMessage>}
    <div className="saved-form-actions"><button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}><Check size={18}/>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
  </form>;
}
