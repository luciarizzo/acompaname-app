import type { SavedTask } from '../types';
const KEY = 'acompaname-v1-tasks';
export function getSavedTasks(): SavedTask[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as SavedTask[]; } catch { return []; }
}
export function saveTask(task: SavedTask) {
  const tasks = [task, ...getSavedTasks()].slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(tasks));
  return tasks;
}
export function clearSavedTasks() { localStorage.removeItem(KEY); }
