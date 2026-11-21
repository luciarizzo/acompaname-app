import { authenticate, json } from '../lib/supabase-admin.mjs';

// GET: devuelve el perfil del usuario con sus contactos de confianza, o null si todavía no configuró nada.
// PUT: guarda el perfil completo y reemplaza sus contactos de confianza.
// Los nombres de los campos que viajan al front son los mismos que usa OnboardingProfile en src/utils/profile.ts.

const toFront = (row, contacts) => ({
  role: row.rol,
  name: row.nombre,
  city: row.ciudad,
  province: row.provincia || '',
  ...(row.ciudad_lat != null && row.ciudad_lon != null ? { cityLat: row.ciudad_lat, cityLon: row.ciudad_lon } : {}),
  accessibility: row.accesibilidad,
  largerText: row.texto_grande,
  highContrast: row.alto_contraste,
  readScreens: row.leer_pantallas,
  preferredPaymentMethod: row.medio_pago_preferido,
  trustedContactsSetup: row.contactos_configurados,
  trustedContacts: contacts.map((contact) => ({ id: contact.id, name: contact.nombre, phone: contact.telefono })),
  savedAddresses: Array.isArray(row.direcciones) ? row.direcciones : [],
});

export const handler = async (event) => {
  try {
    const auth = await authenticate(event);
    if (auth.error) return auth.error;
    const { db, user } = auth;

    if (event.httpMethod === 'GET') {
      const { data: row, error } = await db.from('perfiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!row) return json(200, { profile: null });
      const { data: contacts, error: contactsError } = await db.from('contactos_confianza').select('*').eq('usuario_id', user.id).order('orden');
      if (contactsError) throw contactsError;
      return json(200, { profile: toFront(row, contacts) });
    }

    if (event.httpMethod === 'PUT') {
      const profile = JSON.parse(event.body || '{}');
      const { error } = await db.from('perfiles').upsert({
        id: user.id,
        rol: profile.role === 'supporting' ? 'supporting' : 'self',
        nombre: String(profile.name || ''),
        ciudad: String(profile.city || '').trim().slice(0, 100),
        provincia: String(profile.province || '').trim().slice(0, 100),
        ciudad_lat: Number.isFinite(profile.cityLat) ? profile.cityLat : null,
        ciudad_lon: Number.isFinite(profile.cityLon) ? profile.cityLon : null,
        accesibilidad: String(profile.accessibility || ''),
        texto_grande: Boolean(profile.largerText),
        alto_contraste: Boolean(profile.highContrast),
        leer_pantallas: Boolean(profile.readScreens),
        medio_pago_preferido: String(profile.preferredPaymentMethod || ''),
        contactos_configurados: Boolean(profile.trustedContactsSetup),
        direcciones: (Array.isArray(profile.savedAddresses) ? profile.savedAddresses : []).slice(0, 30)
          // Se conserva la ubicación de cada dirección: sin ella no se puede calcular un viaje.
          .map((item) => ({ id: String(item.id || ''), name: String(item.name || '').trim(), address: String(item.address || '').trim(),
            ...(Number.isFinite(item.lat) && Number.isFinite(item.lon) ? { lat: item.lat, lon: item.lon } : {}) }))
          .filter((item) => item.id && item.address),
        actualizado_en: new Date().toISOString(),
      });
      if (error) throw error;

      // Los contactos se reemplazan completos: se borran los anteriores y se guardan los actuales (máximo dos).
      const { error: deleteError } = await db.from('contactos_confianza').delete().eq('usuario_id', user.id);
      if (deleteError) throw deleteError;
      const contacts = (Array.isArray(profile.trustedContacts) ? profile.trustedContacts : []).slice(0, 2)
        .map((contact, index) => ({ usuario_id: user.id, orden: index + 1, nombre: String(contact.name || '').trim(), telefono: String(contact.phone || '').trim() }))
        .filter((contact) => contact.nombre && contact.telefono);
      if (contacts.length) {
        const { error: insertError } = await db.from('contactos_confianza').insert(contacts);
        if (insertError) throw insertError;
      }
      return json(200, { ok: true });
    }

    return json(405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('perfil', error);
    return json(500, { error: 'No pudimos guardar o leer tu perfil en este momento.' });
  }
};
