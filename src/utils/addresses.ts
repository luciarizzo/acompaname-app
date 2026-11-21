// Direcciones guardadas por el usuario para pedir viajes.
// name es opcional: si está vacío, en la lista se muestra solo la dirección.
// lat y lon vienen de elegir la dirección en la lista de sugerencias; sirven para calcular el viaje.

export interface SavedAddress { id: string; name: string; address: string; lat?: number; lon?: number }

export function addressLabel(item: SavedAddress) {
  return item.name.trim() || item.address;
}

export function hasLocation(item: SavedAddress | undefined): item is SavedAddress & { lat: number; lon: number } {
  return Boolean(item && Number.isFinite(item.lat) && Number.isFinite(item.lon));
}
