import { createClient } from '@supabase/supabase-js';

// Código compartido por las funciones del back.
// Usa la clave secreta de Supabase, que solo existe en el servidor (en el .env local o en la configuración de Netlify).

const headers = { 'Content-Type': 'application/json' };
export const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

let admin = null;
function getAdmin() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  if (!admin) admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

// Devuelve el cliente de Supabase y el usuario que hizo el pedido, o una respuesta de error lista para devolver.
// El front manda la sesión del usuario en el encabezado Authorization; acá se verifica con Supabase.
export async function authenticate(event) {
  const db = getAdmin();
  if (!db) return { error: json(503, { error: 'El servidor no tiene configurada la base de datos.' }) };
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return { error: json(401, { error: 'Necesitás iniciar sesión.' }) };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return { error: json(401, { error: 'Tu sesión venció. Volvé a iniciar sesión.' }) };
  return { db, user: data.user };
}

// Crea la fila del perfil si todavía no existe, para poder guardar gestiones y contactos asociados.
export async function ensureProfileRow(db, userId) {
  const { error } = await db.from('perfiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}
