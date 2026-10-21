export const liveApisEnabled = import.meta.env.VITE_ENABLE_LIVE_APIS === 'true';
export async function functionRequest<T>(name: string, body: unknown): Promise<T> {
  const response = await fetch(`/.netlify/functions/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No pude consultar este servicio en este momento. Podemos volver a intentarlo.');
  return payload as T;
}
