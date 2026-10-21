# Acompáñame V1

Aplicación académica mobile-first para simplificar la interacción con distintos servicios digitales. V1 funciona en modo demostración local y separa cada integración de la interfaz. No realiza compras, reservas ni trámites.

## Requisitos

- Node.js 20 o superior
- npm

## Iniciar localmente

```bash
npm install
npm run dev
```

Abrí la dirección local que muestra Vite (por defecto `http://localhost:5173`). Para validar el bundle de producción:

```bash
npm run build
npm run preview
```

Los resultados demo están identificados en la interfaz y son ejemplos ficticios. Si una integración configurada falla, se muestra el error y no se reemplazan los datos silenciosamente.

La primera visita incluye una configuración de uso de cuatro pasos: para quién se prepara la app, un nombre, la ciudad y perfil opcionales, preferencias de accesibilidad y una revisión antes de guardar. La ciudad configurada (Mendoza por defecto) se reutiliza en salidas y sedes de turnos para no volver a pedirla en cada flujo. Estos datos se guardan solo en `localStorage` de este dispositivo. V1 no crea cuentas ni guarda credenciales, datos de salud, contactos o medios de pago.

## Proveedores de datos

La búsqueda de salidas usa una interfaz en `src/services/events/` y, al activar `VITE_ENABLE_LIVE_APIS=true`, consulta una Netlify Function. Los turnos médicos son siempre una simulación local: nunca consultan agendas ni reservan una visita. Los viajes y la búsqueda de lugares no forman parte de esta versión.

Copiá `.env.example` a `.env` si querés configurar la búsqueda real de salidas. No guardes claves reales en archivos versionados ni uses prefijo `VITE_` para secretos.

- **Ticketmaster Discovery API** (`TICKETMASTER_API_KEY`): requiere una API key del portal de desarrolladores. Los eventos reales se abren en su página oficial; Acompáñame no procesa entradas. Sin clave, se muestran eventos ficticios identificados como demostración.
- **Turnos médicos**: muestra profesionales, horarios y consultorios ficticios. OSDE, PAMI y prestadores médicos se consideran integraciones futuras; no hay conexión ni reserva real.

Netlify Functions evita exponer las llaves al navegador. `netlify.toml` configura build, funciones y fallback de rutas SPA.

## Estructura

- `src/components`: piezas de UI reutilizables
- `src/pages`: inicio, flujos de tarea y Mis gestiones
- `src/services`: contratos/adapters de eventos
- `src/utils`: almacenamiento local
- `netlify/functions`: proxy serverless para servicios externos
- `public`: manifest PWA, ícono y service worker para abrir el shell previamente visitado sin conexión

## Accesibilidad

Tipografía grande, contraste alto opcional, lectura de pantalla con SpeechSynthesis, dictado cuando Web Speech está disponible, controles táctiles amplios, foco visible, navegación obvia y mensajes de carga/error con texto. La app no solicita ubicación.
