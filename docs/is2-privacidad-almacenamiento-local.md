# IS2 - Revisión de datos guardados y privacidad

## 1. Objetivo

Se revisó el almacenamiento local actual del prototipo V1 para identificar qué datos quedan persistidos en el navegador/dispositivo y evaluar riesgos de privacidad antes de incorporar nuevas integraciones.

El análisis se centró en persistencia del lado cliente (navegador) y comportamiento observado en el código vigente.

Fuera de alcance de esta historia: implementar una base de datos central o cambiar la arquitectura de datos remotos.

## 2. Alcance técnico

Mecanismos revisados:

- `localStorage`
- `sessionStorage`
- Persistencia de sesión/autenticación de Supabase en frontend (administrada por SDK)
- `Cache API` / `Service Worker`
- `Cookies`
- `IndexedDB`

Resultado:

- Se encontró uso explícito de `localStorage`, `sessionStorage`, `Service Worker` y `Cache API`.
- No se encontró uso explícito de `document.cookie` ni APIs de `IndexedDB` en el código actual.

## 3. Inventario de datos conservados

> Retención actual = comportamiento observado hoy, no política formal aprobada.

| Dato | Categoría | Almacenamiento | Key | Retención actual | Sensibilidad | Evidencia |
|---|---|---|---|---|---|---|
| `role` | Perfil | `localStorage` | `acompaname-v1-profile` / `acompaname-v1-profile-cuenta` | Sin TTL explícito | Media | `OnboardingProfile.role` en `src/utils/profile.ts`; escritura en `saveOnboardingProfile()` |
| `name` | Perfil identificativo | `localStorage` | `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Media | `OnboardingProfile.name` en `src/utils/profile.ts` |
| `city` | Perfil/ubicación | `localStorage` | `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Media | `OnboardingProfile.city` en `src/utils/profile.ts` |
| `accessibility` | Preferencia de accesibilidad sensible | `localStorage` | `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Alta | `OnboardingProfile.accessibility` en `src/utils/profile.ts` |
| `largerText` | Preferencia visual | `localStorage` | `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Baja | `OnboardingProfile.largerText` en `src/utils/profile.ts` |
| `highContrast` | Preferencia visual | `localStorage` | `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Baja/Media | `OnboardingProfile.highContrast` en `src/utils/profile.ts` |
| `readScreens` | Preferencia de UX accesible | `localStorage` | `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Baja/Media | `OnboardingProfile.readScreens` en `src/utils/profile.ts` |
| `preferredPaymentMethod` | Preferencia de pago | `localStorage` | `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Media | `OnboardingProfile.preferredPaymentMethod` en `src/utils/profile.ts` |
| `trustedContactsSetup` | Estado onboarding | `localStorage` | `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Baja | `OnboardingProfile.trustedContactsSetup` en `src/utils/profile.ts` |
| `trustedContacts[]` (`id,name,phone`) | Contactos de confianza (terceros) | `localStorage` | Dentro de `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Alta | `TrustedContact` en `src/utils/trustedContacts.ts`; guardado de perfil en `saveOnboardingProfile()` |
| `savedAddresses[]` (`id,name,address`) | Direcciones de viaje | `localStorage` | Dentro de `acompaname-v1-profile` / `-cuenta` | Sin TTL explícito | Alta | `SavedAddress` en `src/utils/addresses.ts`; campo en `OnboardingProfile` |
| `SavedTask[]` (`id,kind,title,description,createdAt,mode`) | Gestiones guardadas | `localStorage` | `acompaname-v1-tasks` / `acompaname-v1-tasks-cuenta` | Sin TTL explícito | Media/Alta | `SavedTask` en `src/types/index.ts`; `saveTask()/getSavedTasks()` en `src/utils/storage.ts` |
| Detalles de turnos en gestiones (`specialty/professional/date/time/location`) | Datos de consulta médica persistidos en gestión | `localStorage` | Dentro de `acompaname-v1-tasks` / `-cuenta` (`editChoices`) | Sin TTL explícito | Alta | `SavedTask.editChoices` y `AppointmentOption` en `src/types/index.ts`; carga en `FlowPage` |
| Borrador de búsqueda de eventos/turnos (`step,eventCategory,eventDate,specialty,searchCity,eventQuery`) | Borrador de flujo | `localStorage` | `acompaname-flow-draft-event` / `acompaname-flow-draft-appointment` o variantes `...-cuenta-${accountId}` | TTL 7 días (purga al leer) | Media | `SearchDraft` y `saveFlowDraft(kind, ...)` en `src/pages/FlowPage.tsx`; TTL en `src/utils/flowDraft.ts` |
| Borrador de viajes (`step,toId,fromId,rideId`) | Borrador de flujo | `localStorage` | `acompaname-flow-draft-trip` o `...-cuenta-${accountId}` | TTL 7 días | Media | `TripDraft` y `saveFlowDraft('trip', ...)` en `src/pages/TripFlow.tsx`; TTL en `src/utils/flowDraft.ts` |
| Borrador de cine base (`step,theater,ticketCount`) | Borrador de flujo | `localStorage` | `acompaname-flow-draft-cinema` o `...-cuenta-${accountId}` | TTL 7 días | Media | `Draft` y `saveFlowDraft('cinema', ...)` en `src/pages/CinemaFlow.tsx` |
| Borrador Cinemark (`step,theaterId,movieId,date,timeId,count`) | Borrador de flujo | `localStorage` | `acompaname-flow-draft-cinemark-live` o `...-cuenta-${accountId}` | TTL 7 días | Media | `Draft` y `saveFlowDraft('cinemark-live', ...)` en `src/pages/CinemarkLiveFlow.tsx` |
| Borrador Showcase (`step,movieId,theaterId,date,timeId,count`) | Borrador de flujo | `localStorage` | `acompaname-flow-draft-showcase-live` o `...-cuenta-${accountId}` | TTL 7 días | Media | `Draft` y `saveFlowDraft('showcase-live', ...)` en `src/pages/ShowcaseLiveFlow.tsx` |
| Borrador de sugerencia | Texto temporal de sugerencia | `sessionStorage` | `acompaname-other-suggestion-draft` | Hasta cierre de pestaña o envío exitoso | Media | `sessionStorage.setItem()/removeItem()` en `src/pages/OtherRequestPage.tsx`; key en `src/utils/featureSuggestion.ts` |
| `guideSeen` | Estado de guía de uso | `localStorage` | `acompaname-guide-v1-seen` | Sin TTL explícito | Baja | `localStorage.getItem()/setItem()` en `src/main.tsx` |
| `welcomeSeen` | Estado de bienvenida | `localStorage` | `acompaname-v1-welcome-seen` | Sin TTL explícito | Baja | `localStorage.getItem()/setItem()` en `src/main.tsx` |
| Sesión de autenticación Supabase | Sesión/token de auth frontend | Persistencia del SDK en navegador | Administrada por Supabase SDK (key interna del SDK) | Según ciclo de sesión/refresh del SDK | Alta | `createClient(...)` en `src/services/supabase.ts`; `getSession/signInWithPassword/signOut` en `src/services/account.ts` |
| Cache técnico del Service Worker | Assets de app y shell offline | Cache API | Cache `acompaname-shell-v1` | Hasta invalidación de versión o limpieza del navegador | Baja | `public/sw.js` (`CACHE`, `caches.open`, `cache.put`) |

## 4. Perfil y preferencias

El perfil persistido localmente se modela en `OnboardingProfile` y se guarda bajo `acompaname-v1-profile` (invitado) o `acompaname-v1-profile-cuenta` (modo cuenta).

Grupos principales:

- Datos identificativos: `name`, `role`.
- Ubicación: `city`.
- Preferencias generales de uso: `trustedContactsSetup`.
- Preferencias de accesibilidad: `accessibility`.
- Preferencias visuales y de interacción: `largerText`, `highContrast`, `readScreens`.
- Preferencia de pago: `preferredPaymentMethod`.

Sobre `preferredPaymentMethod`: el código actual guarda solo el tipo de preferencia (`debit-card`, `credit-card` o vacío). No se observó persistencia de número de tarjeta ni datos de instrumento de pago.

## 5. Contactos de confianza

Campos persistidos actualmente por contacto:

- `id`
- `name`
- `phone`

Se almacenan como parte de `trustedContacts` dentro del perfil local. Son datos de terceros y, por lo tanto, requieren cuidado reforzado de minimización, retención y limpieza local.

## 6. Otros datos relevantes

- Gestiones guardadas (`SavedTask`) en `acompaname-v1-tasks` / `-cuenta`.
- Información potencialmente sensible de turnos médicos dentro de `description` y `editChoices.appointmentSlots` de gestiones.
- Direcciones guardadas (`savedAddresses`) dentro del perfil.
- Borradores de flujo para eventos, turnos, viajes y cine (incluyendo variantes live) en keys `acompaname-flow-draft-*`.
- Borrador de sugerencias en `sessionStorage` (`acompaname-other-suggestion-draft`).
- Estado de onboarding/guía (`acompaname-v1-welcome-seen`, `acompaname-guide-v1-seen`).
- Persistencia de sesión de Supabase en navegador por comportamiento del SDK frontend.

## 7. Ciclo de vida y dispositivo compartido

Observaciones de comportamiento actual:

- Persistencia sin TTL explícito:
  - Perfil local.
  - Gestiones locales.
  - Flags de onboarding/guía.
- Persistencia con TTL:
  - Borradores `flowDraft` con TTL de 7 días (`MAX_AGE_MS`) y purga al leer cuando vencen.
- Logout:
  - Se llama `signOut()` de Supabase.
  - Se ejecuta `deactivateAccount()`, que elimina solo `acompaname-v1-profile-cuenta` y `acompaname-v1-tasks-cuenta`.
  - No elimina automáticamente datos de invitado, flags de guía/bienvenida, borradores `flowDraft` ni borrador de sugerencia en `sessionStorage`.
- Modo invitado:
  - Usa claves base sin sufijo `-cuenta`.
- Cambio de cuenta:
  - El modo cuenta usa sufijo `-cuenta`, pero no segmenta `profile/tasks` por `user.id` en la key (a diferencia de `flowDraft`, que sí incluye `accountId` en modo cuenta).
- Dispositivo compartido:
  - Si se comparte navegador/perfil, puede quedar información persistida de personas previas.

Distinción importante:

- Evidencia directa de código: mecanismos/keys/funciones de guardado y borrado anteriores.
- Riesgo potencial: exposición por navegador compartido, retención indefinida y datos sensibles persistidos.

## 8. Evaluación de riesgos

| Dato/Categoría | Riesgo | Nivel | Justificación |
|---|---|---|---|
| Flags de guía/bienvenida | Exposición mínima de estado UX | Bajo | No identifican por sí solos a una persona ni contienen contenido sensible. |
| Preferencias visuales (`largerText`,`highContrast`,`readScreens`) | Perfil de uso | Bajo/Medio | Aisladas son de bajo impacto; combinadas pueden inferir necesidades de accesibilidad. |
| Identificativos de perfil (`name`,`role`) | Identificación local | Medio | Identifican al usuario dentro del dispositivo/navegador. |
| `city` | Ubicación general | Medio | Aporta contexto geográfico del usuario. |
| `preferredPaymentMethod` | Perfil financiero básico | Medio | No hay tarjeta, pero sí preferencia de medio de pago. |
| Borradores de flujo | Huella de comportamiento | Medio | Conservan elecciones e intención de uso durante días. |
| `accessibility` | Dato sensible de accesibilidad/discapacidad | Alto | Puede revelar condición personal sensible en dispositivo compartido. |
| `trustedContacts` | Datos de terceros | Alto | Nombres y teléfonos de terceros persistidos localmente. |
| `savedAddresses` | Ubicación específica | Alto | Direcciones concretas de origen/destino. |
| Detalles de turnos médicos en gestiones | Información potencialmente sensible | Alto | Especialidad/profesional/sede/horarios pueden inferir contexto de salud. |
| Sesión/token Supabase en navegador | Riesgo de sesión local comprometida | Alto | Persistencia de sesión en storage del navegador accesible desde JS del mismo origen. |

## 9. Decisiones y recomendaciones

### A. Razonable conservar localmente

- `guideSeen`, `welcomeSeen`.
- Preferencias visuales (`largerText`, `highContrast`, `readScreens`) con retención razonable.

Motivo: soporte de UX y accesibilidad con baja sensibilidad intrínseca.

### B. Conservar con protecciones adicionales

- `name`, `city`, `role`, `preferredPaymentMethod`.
- `SavedTask` (excepto porciones médicas sensibles, ver C).
- Borradores de flujo (`flowDraft`) y borrador de sugerencia.
- Sesión de auth de Supabase (por diseño SDK, con controles adicionales).

Protecciones recomendadas:

- minimización de campos persistidos;
- política de retención/TTL explícita;
- limpieza reforzada en logout;
- opción visible de “borrar datos locales”;
- revisión de aislamiento por `user.id` en claves de cuenta.

### C. Evitar persistencia local en su forma actual

- `accessibility` cuando incluye categorías sensibles (`disability`, `older-adult`, `both`) sin controles adicionales.
- `trustedContacts` (datos de terceros) persistidos indefinidamente.
- `savedAddresses` sin controles de retención.
- detalles de turnos médicos dentro de gestiones (`description` + `editChoices`), sin TTL.

Motivo: alta sensibilidad o impacto en privacidad en dispositivos compartidos.

### D. Requiere definición adicional del equipo

- Política oficial de retención por tipo de dato local.
- Criterio de persistencia de sesión de auth en frontend (duración y modo esperado por producto).
- Comportamiento objetivo al alternar múltiples cuentas en el mismo navegador.

## 10. Remediaciones priorizadas

**P1 (antes de nuevas integraciones):**

- Definir y aplicar minimización para datos sensibles (`accessibility`, contactos, direcciones, detalles médicos en gestiones).
- Definir política de limpieza en logout y en cambio de cuenta/dispositivo compartido.

**P2 (importante, no bloqueante inmediato):**

- Aislar claves de almacenamiento de cuenta por `user.id` donde hoy se usa solo sufijo `-cuenta`.
- Incorporar controles de retención consistentes para perfil/gestiones (TTL o limpieza guiada).

**P3 (higiene/UX):**

- Exponer una acción explícita de “borrar datos locales”.
- Documentar en UX qué queda guardado localmente y por cuánto tiempo.

## 11. Verificación de criterios de aceptación

**CA1 - CUMPLIDO**  
Se documentaron los datos conservados de perfil, preferencias y contactos, incluyendo campos, keys, mecanismos y evidencia de código.

**CA2 - CUMPLIDO**  
Se identificaron datos que no deberían persistirse en su forma actual y se registraron recomendaciones justificadas por sensibilidad, retención y escenarios de riesgo.

## 12. Fuentes de evidencia

- `src/main.tsx`
- `src/services/supabase.ts`
- `src/services/account.ts`
- `src/services/accountData.ts`
- `src/utils/profile.ts`
- `src/utils/storage.ts`
- `src/utils/storageMode.ts`
- `src/utils/trustedContacts.ts`
- `src/utils/addresses.ts`
- `src/utils/flowDraft.ts`
- `src/utils/featureSuggestion.ts`
- `src/types/index.ts`
- `src/pages/FlowPage.tsx`
- `src/pages/TripFlow.tsx`
- `src/pages/CinemaFlow.tsx`
- `src/pages/CinemarkLiveFlow.tsx`
- `src/pages/ShowcaseLiveFlow.tsx`
- `src/pages/OtherRequestPage.tsx`
- `public/sw.js`
