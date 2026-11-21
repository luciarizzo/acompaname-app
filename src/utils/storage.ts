import type { SavedTask } from '../types';
import { storageKey } from './storageMode';
import { cancelAppointment, deleteTaskOnAccount, pushTask, updateTaskOnAccount, TASKS_KEY } from '../services/accountData';
// Invitado: guarda en localStorage como siempre. Con cuenta: guarda en la copia local y además envía la gestión a la base.
const key = () => storageKey(TASKS_KEY);
export function getSavedTasks(): SavedTask[] {
  try { return JSON.parse(localStorage.getItem(key()) || '[]') as SavedTask[]; } catch { return []; }
}
export function saveTask(task: SavedTask) {
  const tasks = [task, ...getSavedTasks()].slice(0, 50);
  localStorage.setItem(key(), JSON.stringify(tasks));
  pushTask(task);
  return tasks;
}
export function clearSavedTasks() { localStorage.removeItem(key()); }

// Para una cuenta, primero se confirma el cambio remoto. Si falla, el usuario puede
// reintentar sin perder el texto que estaba editando ni alterar la copia local.
export async function updateSavedTask(task: SavedTask): Promise<SavedTask[]> {
  const tasks = getSavedTasks();
  if (!tasks.some(item => item.id === task.id)) throw new Error('No encontramos esa gestión guardada.');
  const updated = tasks.map(item => item.id === task.id ? task : item);
  await updateTaskOnAccount(task);
  localStorage.setItem(key(), JSON.stringify(updated));
  return updated;
}

export async function deleteSavedTask(id: string): Promise<SavedTask[]> {
  const tasks = getSavedTasks();
  if (!tasks.some(item => item.id === id)) throw new Error('No encontramos esa gestión guardada.');
  await deleteTaskOnAccount(id);
  const updated = tasks.filter(item => item.id !== id);
  localStorage.setItem(key(), JSON.stringify(updated));
  return updated;
}

// Un turno reservado ya quedó guardado en la base por el back: solo se agrega a la copia local.
export function addLocalTask(task: SavedTask) {
  const tasks = [task, ...getSavedTasks().filter(item => item.id !== task.id)].slice(0, 50);
  localStorage.setItem(key(), JSON.stringify(tasks));
  return tasks;
}

// Cancela el turno en el back (libera el horario y borra la gestión) y después lo quita de la copia local.
export async function cancelBookedTask(task: SavedTask): Promise<SavedTask[]> {
  if (!task.booking) throw new Error('Esta gestión no tiene un turno reservado.');
  await cancelAppointment(task.booking.slotId);
  const updated = getSavedTasks().filter(item => item.id !== task.id);
  localStorage.setItem(key(), JSON.stringify(updated));
  return updated;
}
