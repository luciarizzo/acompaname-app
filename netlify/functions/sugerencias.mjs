import { authenticate, json } from '../lib/supabase-admin.mjs';

// No permite sugerencias anónimas. El límite evita abusos de la función pública.
const email = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i;
const phone = /(?:\+?\d[\d\s()-]{7,}\d)/;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  try {
    const auth = await authenticate(event);
    if (auth.error) return auth.error;
    const { db, user } = auth;
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { error: 'La sugerencia no tiene un formato válido.' }); }
    if (typeof body.text !== 'string') return json(400, { error: 'Escribí una sugerencia.' });
    const value = body.text.trim();
    if (value.length < 10 || value.length > 280) return json(400, { error: 'La sugerencia debe tener entre 10 y 280 caracteres.' });
    if (email.test(value) || phone.test(value)) return json(400, { error: 'No incluyas correos electrónicos ni teléfonos en tu sugerencia.' });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent, error: countError } = await db.from('sugerencias_funcionalidades')
      .select('id').eq('usuario_id', user.id).gte('creado_en', since).limit(3);
    if (countError) throw countError;
    if ((recent || []).length >= 3) return json(429, { error: 'Ya enviaste varias sugerencias hoy. Volvé a intentar mañana.' });

    const { error } = await db.from('sugerencias_funcionalidades').insert({ usuario_id: user.id, texto: value });
    if (error) throw error;
    return json(201, { ok: true });
  } catch (error) {
    console.error('sugerencias', error);
    return json(500, { error: 'No pudimos recibir tu sugerencia. Intentá de nuevo más tarde.' });
  }
};
