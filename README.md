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

La primera visita incluye una configuración de uso de cuatro pasos: para quién se prepara la app, un nombre y perfil opcionales, preferencias de accesibilidad y una revisión antes de guardar. Estos datos se guardan solo en `localStorage` de este dispositivo. V1 no crea cuentas ni guarda credenciales, datos de salud, contactos o medios de pago.

## Proveedores de datos

La UI usa interfaces en `src/services/` y, al activar `VITE_ENABLE_LIVE_APIS=true`, llama funciones serverless en `netlify/functions/`. Las llaves solo se leen en esas funciones. `npm run dev` sin Netlify Functions usa demo; para probar las funciones localmente, luego de configurar `.env` se puede usar `npx netlify dev`.

Copiá `.env.example` a `.env` para activar integraciones. No guardes claves reales en archivos versionados y no uses prefijo `VITE_` para secretos.

- **Duffel** (`DUFFEL_API_KEY`): crear una cuenta de desarrollador y un token en modo de prueba desde su panel. La búsqueda real devuelve ofertas del proveedor; el modo de prueba puede tener horarios/precios no representativos. V1 solo consulta y muestra ofertas, no crea órdenes ni compra.
- **Google Places API (New)** (`GOOGLE_PLACES_API_KEY`): requiere proyecto de Google Cloud, Places API habilitada, facturación y una clave restringida. El adapter pide campos básicos y solicita ubicación solo al elegir “Buscar cerca de mí”. La distancia se calcula aproximadamente desde las coordenadas compartidas. La disponibilidad horaria no se solicita en esta etapa.
- **Ticketmaster Discovery API** (`TICKETMASTER_API_KEY`): requiere una API key del portal de desarrolladores. Los eventos se abren en su página oficial; Acompáñame no procesa entradas.

Netlify Functions evita exponer las llaves al navegador. `netlify.toml` configura build, funciones y fallback de rutas SPA para un deploy futuro. No hay ningún despliegue configurado ni ejecutado.

## Estructura

- `src/components`: piezas de UI reutilizables
- `src/pages`: inicio, flujos de tarea y Mis gestiones
- `src/services`: contratos/adapters de viajes, lugares y eventos
- `src/utils`: almacenamiento local
- `netlify/functions`: proxy serverless para servicios externos
- `public`: manifest PWA, ícono y service worker para abrir el shell previamente visitado sin conexión

## Accesibilidad

Tipografía grande, contraste alto opcional, lectura de pantalla con SpeechSynthesis, dictado cuando Web Speech está disponible, controles táctiles amplios, foco visible, navegación obvia y mensajes de carga/error con texto. La ubicación solo se solicita en el flujo de búsqueda cercana.
