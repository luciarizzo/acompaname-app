# Evaluación de APIs de agendas médicas

## 1. Objetivo

Este documento evalúa alternativas de APIs de agendas médicas para reemplazar progresivamente la simulación actual de turnos en Acompáñame.

Alcance de esta tarjeta: **evaluación técnica y documentación**.  
Fuera de alcance: implementar integración, crear/reservar turnos reales o modificar comportamiento funcional.

## 2. Necesidad actual de Acompáñame

### Flujo actual (appointment)

Flujo observado en el repositorio:

**especialidad -> opciones simuladas -> revisión -> consulta guardada**

Puntos clave:

- Se elige especialidad.
- Las opciones se generan con `demoAppointments` (simulación).
- Se revisa una opción.
- Se guarda una consulta en “Mis gestiones”.
- No se reserva turno real ni se confirma con un prestador externo.

### Datos actuales

Del flujo y tipos actuales:

- `specialty`.
- `professional` (simulado).
- `location` (simulada).
- `date` / `time` (simulados).
- `city` desde perfil.
- `AppointmentOption.id` de tipo demo.

### Necesidad mínima

La capacidad esencial para reemplazar la simulación actual es:

- **reemplazar `demoAppointments` por disponibilidad real**.

Resultado mínimo esperado de proveedor:

- `slot_id` / identificador estable de disponibilidad.
- especialidad/servicio.
- profesional.
- sede/consultorio.
- fecha/hora.
- estado de disponibilidad.

Crear/modificar/cancelar turnos reales **NO** es requisito para reemplazar la simulación actual.

## 3. Modelo de integración recomendado

Recomendación técnica para siguiente etapa: **API para consultar disponibilidad + reserva/handoff externo**.

Por qué encaja hoy:

- mantiene el flujo guiado actual;
- reemplaza datos demo por slots reales sin rediseñar todo el recorrido;
- evita capturar inicialmente identidad completa del paciente;
- reduce impacto de privacidad en una primera etapa;
- deja la confirmación final de reserva en el proveedor.

Esto es una **recomendación técnica** para prueba futura, no una implementación aprobada.

## 4. Proveedores evaluados

### MedicAI

Fuentes:

- https://www.medicai.com.ar/developers
- https://www.medicai.com.ar/openapi.json

**VERIFICADO**

- API REST pública de Argentina.
- API pública de solo lectura.
- Sin OAuth / API key / sesión para la API pública.
- La documentación declara que no expone datos de pacientes.
- Incluye profesionales con turnera pública.
- Incluye especialidades.
- Incluye obras sociales.
- Incluye consultorios / locations.
- Incluye horarios/slots disponibles.
- Los slots pueden incluir `booking_url`.
- La reserva se completa externamente en MedicAI.
- Incluye identificadores sandbox y datos ficticios para prueba.
- Especificación OpenAPI 3.1.
- La API pública no crea reservas.

Conclusión: **muy buen ajuste** para modelo de disponibilidad + handoff externo.

### Doctoralia / Docplanner

Fuentes:

- https://integrations.docplanner.com/docs/
- https://integrations.docplanner.com/guide/fundamentals/authorization.html
- https://integrations.docplanner.com/guide/integration-process.html
- https://integrations.docplanner.com/guide/api-objects/resources.html
- https://integrations.docplanner.com/guide/api-objects/managing-calendars.html

**VERIFICADO**

- API REST de integraciones.
- Argentina soportada con locale `ar` y dominio `doctoraliar.com`.
- OAuth2.
- Requiere client credentials.
- Dispone de entorno sandbox.
- API cubre facilities, doctors, addresses, services, slots/bookings.
- Permite integración de calendarios más profunda.

**Restricción importante (VERIFICADO)**

- No hay acceso global libre a todos los recursos del marketplace.
- El acceso queda limitado a clínicas/clientes que autorizan la integración.
- El proceso requiere coordinación con Docplanner (especialista, onboarding/aceptación).

Conclusión: técnicamente potente, con barrera de acceso y complejidad mayores para primera prueba.

### DrApp

Fuente:

- https://developers.drapp.com.ar/docs/v1

**VERIFICADO**

- API pública REST documentada (OpenAPI 3.1 vía `openapi.yaml` referenciado desde docs).
- Soporta scheduling y otros recursos.
- Usa API keys Bearer.
- Distingue claves sandbox y producción.
- Requiere registrar app en portal de desarrolladores.
- Producción requiere aprobación/instalación/autorización del centro.
- Maneja scopes.
- Sandbox disponible.
- Documenta límites de uso (rate limits).

Conclusión: alternativa técnicamente válida, pero con proceso de integración/autorización más complejo que MedicAI para una primera prueba.

### AgendaPro (baseline)

Fuente:

- https://developers.agendapro.com/v1.0/reference/listar-horas-disponibles-para-un-servicio

**VERIFICADO**

- Permite consultar horas disponibles de un servicio.
- Usa ID de servicio (`/services/{id}/available_hours`).
- La consulta puede filtrar por `provider_id` o `location_id`.

Nota: se usa solo como baseline de comparación, no como nueva alternativa recomendada en esta tarjeta.

## 5. Comparación

Estados usados: **VERIFICADO / NO VERIFICADO / NO APLICA**.

| Proveedor | Argentina | API documentada | Auth | Especialidades/servicios | Profesionales | Sedes | Disponibilidad | Reserva real | Handoff externo | Sandbox | Barreras de acceso | Complejidad para Acompáñame |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MedicAI | VERIFICADO | VERIFICADO | VERIFICADO (sin auth en API pública) | VERIFICADO | VERIFICADO | VERIFICADO | VERIFICADO | VERIFICADO (NO APLICA en API pública) | VERIFICADO (`booking_url`) | VERIFICADO | VERIFICADO (baja para lectura pública) | VERIFICADO (baja-media) |
| Doctoralia/Docplanner | VERIFICADO | VERIFICADO | VERIFICADO (OAuth2 + client credentials) | VERIFICADO | VERIFICADO | VERIFICADO | VERIFICADO | VERIFICADO | NO VERIFICADO | VERIFICADO | VERIFICADO (acceso por cliente autorizado + proceso con especialista) | VERIFICADO (alta) |
| DrApp | VERIFICADO | VERIFICADO | VERIFICADO (Bearer API key) | VERIFICADO | VERIFICADO | VERIFICADO | VERIFICADO | VERIFICADO | NO VERIFICADO | VERIFICADO | VERIFICADO (registro app + aprobación + instalación/autorización) | VERIFICADO (media-alta) |
| AgendaPro (baseline) | NO VERIFICADO | VERIFICADO | VERIFICADO (Basic según OpenAPI mostrado en la referencia) | VERIFICADO (servicio por ID) | VERIFICADO (`provider_id`) | VERIFICADO (`location_id`) | VERIFICADO | NO VERIFICADO | NO VERIFICADO | NO VERIFICADO | NO VERIFICADO | NO VERIFICADO |

## 6. Evaluación frente a Acompáñame

### MedicAI

- ¿Puede reemplazar `demoAppointments`? **Sí (VERIFICADO)**.
- ¿Requiere datos de paciente para la prueba? **No (VERIFICADO)** para consulta pública.
- ¿Podemos probar sin reservar turnos reales? **Sí (VERIFICADO)**.
- ¿Encaja con disponibilidad + handoff? **Sí (VERIFICADO)**.
- Gaps principales: normalización local de especialidades/IDs y manejo de fallback si API externa falla.

### Doctoralia / Docplanner

- ¿Puede reemplazar `demoAppointments`? **Sí (VERIFICADO)**.
- ¿Requiere datos de paciente para la prueba? **NO VERIFICADO** (depende del flujo exacto elegido y alcance acordado).
- ¿Podemos probar sin reservar turnos reales? **Sí (VERIFICADO)** al usar lectura de recursos/slots.
- ¿Encaja con disponibilidad + handoff? **NO VERIFICADO** como patrón nativo (documentación enfocada en integración profunda de calendario/booking).
- Gaps principales: acceso restringido por cliente autorizado, onboarding formal y mayor complejidad operativa.

### DrApp

- ¿Puede reemplazar `demoAppointments`? **Sí (VERIFICADO)** por alcance de scheduling/read.
- ¿Requiere datos de paciente para la prueba? **No necesariamente (VERIFICADO)** para consulta de disponibilidad.
- ¿Podemos probar sin reservar turnos reales? **Sí (VERIFICADO)** con sandbox y endpoints de lectura.
- ¿Encaja con disponibilidad + handoff? **NO VERIFICADO** explícitamente en docs (sí encaja técnicamente por API de scheduling).
- Gaps principales: alta administrativa/técnica (registro, aprobación e instalación) y gestión de scopes/keys.

### AgendaPro (baseline)

- ¿Puede reemplazar `demoAppointments`? **Parcialmente (VERIFICADO)** para disponibilidad por servicio.
- ¿Requiere datos de paciente para la prueba? **NO VERIFICADO**.
- ¿Podemos probar sin reservar turnos reales? **VERIFICADO** para endpoint de disponibilidad listado.
- ¿Encaja con disponibilidad + handoff? **NO VERIFICADO**.
- Gaps principales: evidencia usada en esta tarjeta está acotada a un endpoint baseline.

## 7. Recomendación

Recomendación principal:

**Evaluar MedicAI como primera alternativa para una prueba técnica de disponibilidad real + handoff externo.**

Justificación:

- API pública y documentada;
- cobertura en Argentina;
- API pública de solo lectura;
- sin autenticación en la API pública;
- sin datos de pacientes en respuestas según documentación;
- disponibilidad real de turnos;
- `booking_url` para handoff;
- identificadores sandbox para pruebas;
- encaje directo con el modelo actual de Acompáñame.

Importante:

- esto **NO** implica aprobación definitiva de proveedor;
- es recomendación para una **PRUEBA TÉCNICA futura**;
- Doctoralia/Docplanner y DrApp se mantienen como opciones válidas para una integración más profunda si el producto evoluciona.

## 8. Privacidad

En relación con [is2-privacidad-almacenamiento-local.md](./is2-privacidad-almacenamiento-local.md):

Ventaja del modelo recomendado (disponibilidad + handoff): Acompáñame podría consultar disponibilidad sin enviar datos de paciente en la primera prueba.

Si a futuro se crean turnos reales, deberá revisarse específicamente:

- identidad;
- contacto;
- especialidad/servicio;
- IDs de paciente y externos;
- detalles del turno;
- tokens/keys/secretos;
- consentimiento;
- retención y minimización.

## 9. Riesgos y decisiones futuras

- Cobertura real de profesionales/sedes por proveedor en regiones objetivo.
- Dependencia operativa de servicio externo y SLA.
- Normalización de catálogos de especialidades/servicios.
- Gestión de IDs externos (slot/profesional/sede/servicio).
- Estrategia de fallback cuando API externa no responda.
- UX al abrir `booking_url` y retorno al flujo.
- Accesibilidad del handoff externo.
- Política de privacidad y retención antes de habilitar reservas reales.

## 10. Verificación de criterios de aceptación

Con esta documentación:

- Comparación de alternativas de APIs de agenda médica: **CUMPLIDO**.
- Requisitos técnicos para reemplazar simulación actual: **CUMPLIDO**.
- Recomendación técnica razonada para siguiente prueba: **CUMPLIDO**.

## 11. Fuentes

### Fuentes externas

- https://www.medicai.com.ar/developers  
  Respalda: alcance API pública, solo lectura, sin auth, sin datos de pacientes, `booking_url`, sandbox.
- https://www.medicai.com.ar/openapi.json  
  Respalda: OpenAPI 3.1 y contrato técnico público de endpoints.
- https://integrations.docplanner.com/docs/  
  Respalda: dominio/locale Argentina, recursos API (facilities/doctors/addresses/services/slots/bookings), auth por OAuth2 en endpoints.
- https://integrations.docplanner.com/guide/fundamentals/authorization.html  
  Respalda: OAuth2, client credentials, sandbox/prod credentials.
- https://integrations.docplanner.com/guide/integration-process.html  
  Respalda: proceso formal de integración, sandbox access coordinado, activación por cliente/autorización.
- https://integrations.docplanner.com/guide/api-objects/resources.html  
  Respalda: modelo de recursos, acceso limitado a clientes autorizados, doctors/addresses/services/slots/bookings.
- https://integrations.docplanner.com/guide/api-objects/managing-calendars.html  
  Respalda: manejo avanzado de calendarios, slots y bookings.
- https://developers.drapp.com.ar/docs/v1  
  Respalda: documentación de referencia de DrApp y enlace al OpenAPI público usado por el visor.
- https://developers.agendapro.com/v1.0/reference/listar-horas-disponibles-para-un-servicio  
  Respalda baseline: disponibilidad por servicio + filtros `provider_id` / `location_id`.

### Evidencia del repositorio

- [src/pages/FlowPage.tsx](C:/Users/GeGu551/Documents/GitHub/acompaname-app/src/pages/FlowPage.tsx)
- [src/types/index.ts](C:/Users/GeGu551/Documents/GitHub/acompaname-app/src/types/index.ts)
- [src/utils/flowDraft.ts](C:/Users/GeGu551/Documents/GitHub/acompaname-app/src/utils/flowDraft.ts)
- [src/utils/storage.ts](C:/Users/GeGu551/Documents/GitHub/acompaname-app/src/utils/storage.ts)
- [src/utils/profile.ts](C:/Users/GeGu551/Documents/GitHub/acompaname-app/src/utils/profile.ts)
- [docs/is2-privacidad-almacenamiento-local.md](C:/Users/GeGu551/Documents/GitHub/acompaname-app/docs/is2-privacidad-almacenamiento-local.md)
