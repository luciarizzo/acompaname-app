import { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { searchAddresses, type AddressSuggestion } from '../services/trips';
import type { UserLocation } from '../types';

// Campo de dirección con sugerencias mientras se escribe (calles con altura y lugares conocidos).
// La dirección queda lista cuando la persona toca una sugerencia: así sabemos dónde queda en el mapa.
interface Props { id: string; value: string; location: UserLocation; onType: (value: string) => void; onSelect: (item: AddressSuggestion) => void; selected: boolean }

export function AddressAutocomplete({ id, value, location, onType, onSelect, selected }: Props) {
  const listId = useId();
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState('');
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (selected || value.trim().length < 3) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    const request = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchAddresses(value.trim(), location, controller.signal);
        if (request !== requestId.current) return;
        setResults(items); setUnavailable(''); setActive(-1);
      } catch (error) {
        if (!controller.signal.aborted && request === requestId.current) { setUnavailable(error instanceof Error && error.message !== 'Sin conexión' ? error.message : 'No pudimos buscar direcciones ahora. Probá de nuevo en un momento.'); setResults([]); }
      } finally { if (request === requestId.current) setLoading(false); }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value, location.city, location.province, location.lat, location.lon, selected]);

  const choose = (item: AddressSuggestion) => { onSelect(item); setResults([]); };
  const visible = !selected && value.trim().length >= 3;

  return <div className="locality-picker">
    <input id={id} className="form-control" role="combobox" aria-autocomplete="list" aria-expanded={visible && results.length > 0} aria-controls={listId}
      aria-activedescendant={active >= 0 && results[active] ? `${listId}-${active}` : undefined} value={value} maxLength={120} autoComplete="off"
      placeholder="Escribí una calle con número o un lugar"
      onChange={event => onType(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 150)}
      onKeyDown={event => {
        if (!results.length || !visible) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i + 1) % results.length); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i + results.length - 1) % results.length); }
        if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(results[active]); }
      }}/>
    {visible && (focused || results.length > 0) && <>
      {loading && <p className="locality-hint" role="status">Buscando direcciones…</p>}
      {!loading && unavailable && <p className="locality-hint" role="status">{unavailable}</p>}
      {!loading && !unavailable && results.length === 0 && <p className="locality-hint" role="status">No encontramos esa dirección en {location.city}. Probá con la calle y el número, por ejemplo «San Martín 1200».</p>}
      {results.length > 0 && <ul className="locality-suggestions address-suggestions" id={listId} role="listbox" aria-label="Direcciones sugeridas">{results.map((item, index) =>
        <li id={`${listId}-${index}`} key={item.id} role="option" aria-selected={active === index}>
          <button type="button" className={active === index ? 'active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}>
            <MapPin size={18} aria-hidden="true"/><span className="address-suggestion-copy"><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}</span>
          </button>
        </li>)}</ul>}
    </>}
  </div>;
}
