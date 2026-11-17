import { useEffect, useRef } from 'react';

/**
 * Captura el botón Atrás del navegador o celular mientras hay una vista de la app
 * abierta. Reinstala una única entrada de protección por pulsación, sin crear
 * entradas adicionales para cada paso del formulario.
 *
 * La vista continúa manejando su propio paso y el botón «Volver» de la interfaz.
 */
export function useBrowserBack(onBack: () => void) {
  const callback = useRef(onBack);
  callback.current = onBack;
  useEffect(() => {
    const token = `acompaname-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const marker = { acompanameNavigation: token };
    window.history.pushState(marker, '');
    const onPopState = () => {
      // Al retroceder recuperamos la entrada; no dejamos salir del sitio.
      window.history.pushState(marker, '');
      callback.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}
