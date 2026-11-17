import { useEffect, useId, useRef, useState } from 'react';

interface Locality { id: string; name: string; province: string }
interface Props { id: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }

export function LocalityAutocomplete({ id, value, onChange, placeholder = 'Escribí tu ciudad o localidad', required }: Props) {
  const listId = useId();
  const [results, setResults] = useState<Locality[]>([]);
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [active, setActive] = useState(-1);
  const requestId = useRef(0);
  const selected = useRef(value);
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  useEffect(() => {
    if (!opened || value.trim().length < 2 || normalize(value) === normalize(selected.current)) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    const request = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/.netlify/functions/search-localities?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Sin conexión');
        const data: { items?: Locality[] } = await response.json();
        if (request !== requestId.current) return;
        setResults(Array.isArray(data.items) ? data.items : []);
        setUnavailable(false);
        setActive(-1);
      } catch {
        if (!controller.signal.aborted && request === requestId.current) { setUnavailable(true); setResults([]); }
      } finally { if (request === requestId.current) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [opened, value]);

  const choose = (item: Locality) => {
    selected.current = item.name;
    onChange(item.name);
    setOpened(false);
    setResults([]);
  };
  const visible = opened && value.trim().length >= 2 && normalize(value) !== normalize(selected.current);
  return <div className="locality-picker">
    <input id={id} className="form-control" role="combobox" aria-autocomplete="list" aria-expanded={visible && results.length > 0} aria-controls={listId} aria-activedescendant={active >= 0 && results[active] ? `${listId}-${active}` : undefined} value={value} required={required} maxLength={60} placeholder={placeholder}
      onChange={event => { selected.current = ''; onChange(event.target.value); setOpened(true); }}
      onFocus={() => { if (value.trim() !== selected.current) setOpened(true); }}
      onBlur={() => window.setTimeout(() => setOpened(false), 120)}
      onKeyDown={event => {
        if (event.key === 'Escape') { setOpened(false); return; }
        if (!results.length || !visible) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => (index + 1) % results.length); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => (index + results.length - 1) % results.length); }
        if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(results[active]); }
      }}/>
    {visible && <>
      {loading && <p className="locality-hint" role="status">Buscando localidades…</p>}
      {!loading && unavailable && <p className="locality-hint" role="status">No se pudo consultar el listado oficial. Podés escribir la localidad manualmente.</p>}
      {!loading && !unavailable && results.length === 0 && <p className="locality-hint" role="status">No hay sugerencias. Revisá el nombre o seguí escribiendo.</p>}
      {results.length > 0 && <ul className="locality-suggestions" id={listId} role="listbox" aria-label="Localidades sugeridas">{results.map((item, index) =>
        <li id={`${listId}-${index}`} key={item.id} role="option" aria-selected={active === index}><button type="button" className={active === index ? 'active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}><strong>{item.name}</strong><span>{item.province}</span></button></li>
      )}</ul>}
    </>}
  </div>;
}
