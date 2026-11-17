// Direcciones guardadas por el usuario para pedir viajes.
// name es opcional: si está vacío, en la lista se muestra solo la dirección.

export interface SavedAddress { id: string; name: string; address: string }

export function addressLabel(item: SavedAddress) {
  return item.name.trim() || item.address;
}
