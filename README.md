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

Abrí la dirección local que muestra Vite (por defecto `http://localhost:5173`). `npm run dev` levanta también el back: las funciones de `netlify/functions/` responden en la misma dirección, bajo `/.netlify/functions/`. Para validar el bundle de producción:

```bash
npm run build
npm run preview
```

Los resultados demo están identificados en la interfaz y son ejemplos ficticios. Si una integración configurada falla, se muestra el error y no se reemplazan los datos silenciosamente.

La primera visita incluye una configuración de uso de cuatro pasos: para quién se prepara la app, un nombre y perfil opcionales, la ciudad, preferencias de accesibilidad y una revisión antes de guardar. La ciudad configurada (Mendoza por defecto) se reutiliza en salidas y sedes de turnos para no volver a pedirla en cada flujo. Estos datos se guardan solo en `localStorage` de este dispositivo. V1 no crea cuentas ni guarda credenciales, datos de salud ni medios de pago.

Durante el onboarding se pueden guardar hasta dos contactos de confianza, ambos opcionales. Los perfiles V1 existentes ven ese paso una sola vez. Después, la app muestra esos contactos y permite llamar desde el marcador del teléfono; sus datos quedan guardados solo en el dispositivo y la lista no ofrece agregar ni quitar contactos desde el uso diario. Abrir o cerrar esta ayuda no reinicia el flujo en curso. Al escribir una solicitud de salida que menciona “sábado”, la fecha se completa con el próximo sábado; el usuario puede cambiarla antes de buscar.

## Configurar la base de datos (una sola vez)

La app guarda los datos de los usuarios en Supabase. Las claves no están en el repo porque es público: cada integrante las copia a un archivo `.env` local, que nunca se sube.

1. Pedile a quien administra el proyecto que te invite a la organización de Supabase. Te llega un mail: aceptá la invitación y entrá a supabase.com.
2. En la carpeta del proyecto, copiá `.env.example` y renombrá la copia a `.env`.
3. En Supabase, abrí el proyecto `acompaname` y entrá a **Project Settings > API Keys**. Copiá estos valores en tu `.env`:
   - `VITE_SUPABASE_URL` y `SUPABASE_URL`: la URL del proyecto (por ejemplo `https://abcdefgh.supabase.co`).
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: la clave que empieza con `sb_publishable_`.
   - `SUPABASE_SECRET_KEY`: la clave que empieza con `sb_secret_`.
4. Guardá el archivo. No hace falta repetir estos pasos: sirven para todas las veces que levantes el proyecto.

Nunca subas el archivo `.env` ni pegues la clave secreta en el código, en el README ni en un mensaje público: da acceso total a la base de datos.

## Proveedores de datos

La búsqueda de salidas usa una interfaz en `src/services/events/` y, al activar `VITE_ENABLE_LIVE_APIS=true`, consulta una Netlify Function para **Todas las actividades, Música, Teatro, Deportes y Otras salidas**. La función lee el listado estructurado publicado en el buscador oficial de Turismo Buenos Aires, aplica las categorías que publica el organismo y muestra el horario informado junto al enlace de cada organizador. La agenda se actualiza periódicamente; por eso solo se permiten búsquedas fechadas en los próximos siete días, y se recomienda confirmar los horarios en la fuente. En Rosario, donde no se expone un rubro estructurado en las tarjetas, se clasifica de manera conservadora por palabras del título; los casos ambiguos quedan en «Otras salidas» y también aparecen en «Todas». Los turnos médicos son siempre una simulación local: nunca consultan agendas ni reservan una visita. Los viajes y la búsqueda de lugares no forman parte de esta versión.

También se puede cambiar la ciudad en el buscador de eventos culturales. La agenda de Rosario se obtiene del sitio oficial municipal; para Córdoba Capital, Mendoza Capital y La Plata se enlaza la fuente municipal correspondiente cuando no existe un feed verificado de actividades. Para cualquier otra ciudad, se informa que todavía no hay proveedor local automático, sin mostrar datos inventados. Las fuentes se resuelven en `netlify/lib/cultural-regions.mjs`.

Para activar eventos reales en Netlify, configurar `VITE_ENABLE_LIVE_APIS=true` en el entorno de compilación y volver a desplegar. **No hace falta API Key.** La fuente es la página pública de Turismo BA: https://turismo.buenosaires.gob.ar/es/article/que-hacer-esta-semana. Su listado estructurado **no es una API pública documentada**; si el sitio cambia, la función informa un error en vez de presentar resultados falsos. No se realiza reserva ni compra de entradas.

### Cartelera de cine real

La sección **Cine** utiliza carteleras oficiales verificadas de Cinemark Hoyts, Showcase, Atlas, Cinépolis y Cinemacenter. No necesita API Key ni tiene costos por consultas. El recorrido permite elegir la cadena, estimar entradas y abrir su cartelera oficial, donde la persona comprueba el complejo disponible en su localidad, elige película, fecha, horario y butacas y efectúa el pago. **No hay integración automática de funciones, precios ni disponibilidad de asientos**; no se simula esa información. Guardar un plan en Acompáñame **no reserva ni compra** entradas.

**Integraciones gratuitas de consulta:** Cinemark utiliza su servicio web público de solo lectura, con referencia técnica en el proyecto independiente [butaca](https://github.com/crafter-station/butaca) (licencia MIT). Permite elegir complejo, película, fecha y función; muestra cupos informados por el cine, sin abrir órdenes ni requerir una cuenta. Showcase usa el listado público de Voy al Cine y su servicio de funciones por película. Ambas fuentes son interfaces no documentadas para integraciones de terceros: pueden cambiar, limitar solicitudes o dejar de funcionar. Por eso conservamos los enlaces oficiales y mensajes explícitos de error. Las demás cadenas siguen con derivación oficial. La elección de butacas y el pago siempre se realizan en la web del cine; los links pueden requerir volver a seleccionar la función.

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
