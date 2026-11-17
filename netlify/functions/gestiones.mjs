import { authenticate, ensureProfileRow, json } from '../lib/supabase-admin.mjs';
import { validTaskDescriptionUpdate } from '../lib/validar-gestion.mjs';

// GET: devuelve las últimas 50 gestiones del usuario, de la más nueva a la más vieja.
// POST: guarda una gestión nueva.
// Los nombres de los campos que viajan al front son los mismos que usa SavedTask en src/types/index.ts.

const tipos = ['event', 'cinema', 'appointment', 'trip', 'other'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validAppointmentChoices(value) {
  if (!value || !Array.isArray(value.appointmentSlots) || !value.appointmentSlots.length || value.appointmentSlots.length > 8) return false;
  return value.appointmentSlots.every(slot => slot && ['id','specialty','professional','date','time','location'].every(key => typeof slot[key] === 'string' && slot[key].trim() && slot[key].length <= 160));
}
const toFront = (row) => ({ id: row.id, kind: row.tipo, title: row.titulo, description: row.descripcion, createdAt: row.creado_en, mode: row.modo, ...(row.opciones_edicion ? { editChoices: row.opciones_edicion } : {}) });

export const handler = async (event) => {
  try {
    const auth = await authenticate(event);
    if (auth.error) return auth.error;
    const { db, user } = auth;

    if (event.httpMethod === 'GET') {
      const { data, error } = await db.from('gestiones').select('*').eq('usuario_id', user.id).order('creado_en', { ascending: false }).limit(50);
      if (error) throw error;
      return json(200, { tasks: data.map(toFront) });
    }

    if (event.httpMethod === 'POST') {
      const task = JSON.parse(event.body || '{}');
      if (!tipos.includes(task.kind) || typeof task.title !== 'string' || !task.title.trim() || task.title.length > 120) return json(400, { error: 'La gestión no tiene un formato válido.' });
      if (task.editChoices && (task.kind !== 'appointment' || !validAppointmentChoices(task.editChoices))) return json(400, { error: 'Las opciones de edición no tienen un formato válido.' });
      await ensureProfileRow(db, user.id);
      // Se usa el mismo id que generó el front, así la copia local y la de la base son la misma gestión.
      // Si la gestión ya estaba guardada, no se duplica.
      const { error } = await db.from('gestiones').upsert({
        id: task.id,
        usuario_id: user.id,
        tipo: task.kind,
        titulo: String(task.title),
        descripcion: String(task.description || ''),
        modo: task.mode === 'real' ? 'real' : 'demo',
        creado_en: task.createdAt || new Date().toISOString(),
        ...(task.editChoices ? { opciones_edicion: task.editChoices } : {}),
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
      return json(201, { ok: true });
    }

    if (event.httpMethod === 'PUT') {
      const task = JSON.parse(event.body || '{}');
      if (!uuid.test(String(task.id || '')) || typeof task.title !== 'string' || !task.title.trim() || task.title.length > 120 || typeof task.description !== 'string' || task.description.length > 2000) {
        return json(400, { error: 'Revisá el título y los datos de la gestión.' });
      }
      const { data: original, error: lookupError } = await db.from('gestiones')
        .select('tipo, descripcion, opciones_edicion')
        .eq('usuario_id', user.id).eq('id', task.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (!original) return json(404, { error: 'No encontramos esta gestión en tu cuenta.' });
      if (!validTaskDescriptionUpdate(original, task.description.trim())) {
        return json(400, { error: 'Solo podés elegir horarios y lugares ofrecidos al guardar la gestión.' });
      }
      const { data, error } = await db.from('gestiones')
        .update({ titulo: task.title.trim(), descripcion: task.description.trim() })
        .eq('usuario_id', user.id).eq('id', task.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return json(404, { error: 'No encontramos esta gestión en tu cuenta.' });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!uuid.test(String(id || ''))) return json(400, { error: 'La gestión no tiene un identificador válido.' });
      const { data, error } = await db.from('gestiones').delete()
        .eq('usuario_id', user.id).eq('id', id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return json(404, { error: 'No encontramos esta gestión en tu cuenta.' });
      return json(200, { ok: true });
    }

    return json(405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('gestiones', error);
    return json(500, { error: 'No pudimos guardar o leer tus gestiones en este momento.' });
  }
};
