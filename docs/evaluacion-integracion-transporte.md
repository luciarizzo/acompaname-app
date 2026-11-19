# Evaluación de alternativas para solicitar transporte

## 1. Objetivo

Esta historia evalúa alternativas **autorizadas** para iniciar una solicitud de transporte (Uber, taxi o remis) desde Acompáñame, con foco en decidir una integración viable para una prueba futura.

Alcance de esta evaluación:

- comparar deep links/enlaces externos y API solo cuando exista documentación/autorización verificable;
- **no** solicitar viajes reales;
- **no** implementar integración en esta tarjeta.

## 2. Estado actual de Acompáñame

Resumen del estado vigente del flujo de viajes:

- `TripFlow` sigue: **destino -> origen -> opciones -> revisión -> finalización**.
- El flujo actual es **simulado**: no solicita un vehículo real ni genera cobros.
- `SavedAddress` hoy contiene `id`, `name`, `address`.
- No hay coordenadas (`lat/lng`) en `SavedAddress`.
- Al confirmar, se guarda una `SavedTask` (`kind: "trip"`) con descripción textual y `mode: "demo"`.
- En `TripFlow` no se construyen URLs ni se abre una app externa de transporte.
- Sí existen patrones de handoff externo en otros flujos del producto (por ejemplo, enlaces oficiales en cine/eventos).

## 3. Alternativas evaluadas

### Uber

#### 3.1 Deep Links (VERIFICADO)

**Qué permite**

- Abrir la experiencia de Uber con datos preconfigurados (por ejemplo pickup/destination y, según corresponda, producto), para que la persona usuaria continúe en Uber.

**Requisitos**

- Usar el esquema documentado oficialmente por Uber Developers.
- Definir datos mínimos de origen/destino del lado de Acompáñame.

**Nivel de integración**

- Bajo/medio (menor complejidad que API completa).

**¿Es razonable para prueba sin viaje real?**

- **Sí (VERIFICADO)** como candidato principal: permite handoff sin que Acompáñame ejecute la solicitud del viaje directamente.

#### 3.2 Ride Request Button (VERIFICADO)

**Qué permite**

- Un mecanismo oficial de Uber para iniciar el flujo de solicitud desde una integración externa.

**Requisitos**

- Ajustarse al producto/documentación oficial de Ride Requests.

**Nivel de integración**

- Intermedio.

**¿Es razonable para prueba sin viaje real?**

- **Sí (VERIFICADO)**, según alcance de prueba controlada y sin ejecución real desde Acompáñame.

#### 3.3 Ride Requests API (VERIFICADO con restricciones)

**Qué permite**

- Integración más profunda y programática del proceso de solicitud.

**Requisitos**

- Autenticación y permisos/scopes.
- Determinados accesos requieren aprobación de Uber.

**Nivel de integración**

- Alto (mayor complejidad técnica y de cumplimiento).

**¿Es razonable para prueba sin viaje real?**

- **No como primera opción** para esta historia. La API no es el camino recomendado para una prueba inicial de bajo riesgo.

---

### Taxi / BA Taxi

**Qué servicio oficial existe (VERIFICADO)**

- BA Taxi: aplicación oficial de la Ciudad de Buenos Aires para solicitar taxis.

**Qué sabemos de API Transporte BA (VERIFICADO)**

- Existe una API Unificada de Transporte de la Ciudad.

**Qué NO pudimos verificar (NO VERIFICADO)**

- Que la API de Transporte BA permita iniciar/reservar un viaje en BA Taxi desde apps de terceros.
- Deep links oficiales de BA Taxi para integración externa.

> Conclusión de esta sección: una API de datos/transporte **no equivale automáticamente** a una API para pedir taxis.

---

### Remis

**Servicio encontrado (VERIFICADO)**

- Sitio web público “PIDA SU REMIS”.

**Posibilidad conceptual**

- En términos conceptuales, podría existir un patrón de “continuar en sitio externo”.

**Qué NO está verificado (NO VERIFICADO)**

- API pública/documentada para terceros.
- Esquema de deep links autorizado y documentado para integración.

> Con la evidencia disponible, remis queda como alternativa sin integración autorizada verificable.

## 4. Comparación

| Alternativa | Mecanismo verificado | Acceso/requisitos | ¿Permite handoff externo? | ¿Apto para prueba controlada? | Limitaciones |
|---|---|---|---|---|---|
| Uber | Deep Links, Ride Request Button, Ride Requests API (**VERIFICADO**) | Deep link: menor barrera. API: autenticación + scopes + aprobaciones según acceso | Sí (**VERIFICADO**) | Sí, principalmente vía deep link (**VERIFICADO**) | API más compleja; no corresponde solicitar viajes reales en esta tarjeta |
| Taxi (BA Taxi) | App oficial BA Taxi (**VERIFICADO**). API Transporte BA (**VERIFICADO**) | No se verificó acceso de terceros para solicitud de taxi | **No verificado** para solicitud externa | No como primera opción (incertidumbre de integración) | No hay evidencia suficiente de API/deep link para pedir taxi desde tercero |
| Remis | Sitio web PIDA SU REMIS (**VERIFICADO**) | Sin API/deep link documentado de terceros (**NO VERIFICADO**) | Conceptualmente sí por web, técnicamente no verificado | No recomendada por ahora | Falta documentación técnica/autorización de integración |

## 5. Compatibilidad con TripFlow

Estado frente a una futura prueba de handoff:

**YA DISPONIBLE**

- origen/destino textual;
- `id` interno de direcciones;
- `address`.

**PARCIAL**

- localidad (hay ciudad de perfil, no localidad/campo estructurado por cada punto);
- patrón de link externo ya usado en otros flujos (no en `TripFlow`).

**NO DISPONIBLE**

- coordenadas de origen/destino;
- identificadores geográficos externos;
- handoff externo dentro de `TripFlow`.

Estos gaps impactan una implementación futura, pero **no bloquean** el cierre documental de esta tarjeta.

## 6. Recomendación

Recomendación principal:

> **“Evaluar/probar primero un deep link oficial de Uber antes de considerar una integración mediante Ride Requests API.”**

Justificación:

- respaldo en documentación oficial de Uber;
- menor complejidad que una integración API completa;
- coherencia con la arquitectura actual (Acompáñame ya usa patrones de continuación externa en otros flujos);
- la confirmación final queda del lado de Uber;
- evita que Acompáñame solicite directamente el viaje durante la prueba.

Esta recomendación es para una **prueba futura controlada**, no una implementación ya aprobada.

## 7. Qué NO recomendamos por ahora

- Solicitar viajes reales mediante API desde Acompáñame en esta etapa.
- Asumir que BA Taxi tiene API de solicitud para terceros sin evidencia explícita.
- Utilizar integraciones no documentadas/no autorizadas.
- Scraping o automatización de apps de transporte.
- Asumir capacidades de integración de remis sin documentación oficial/autorizada.

## 8. Riesgos para una prueba futura

- precisión de origen/destino con direcciones textuales;
- falta de coordenadas (`lat/lng`);
- diferencias web vs mobile para apertura de apps;
- app externa no instalada;
- necesidad de fallback claro;
- privacidad de datos incluidos en URLs;
- accesibilidad y contexto al salir de Acompáñame y continuar en otra app/sitio.

Son riesgos para una historia de implementación futura.

## 9. Verificación de criterios de aceptación

**CA1 - CUMPLIDO**

Se compararon Uber, taxi y remis documentando mecanismos **verificados**, requisitos y limitaciones, diferenciando explícitamente lo **no verificado**.

**CA2 - CUMPLIDO**

Se dejó recomendación concreta para prueba controlada: priorizar deep link oficial de Uber sin solicitar viajes reales desde Acompáñame.

## 10. Fuentes

### Fuentes externas

Fecha de consulta: 2026-11-19.

- Uber Developers — Ride Requests: <https://developer.uber.com/products/ride-requests?deeplink=true>
- Uber Developers — Deep Links introduction: <https://developer.uber.com/docs/riders/ride-requests/tutorials/deep-links/introduction>
- Uber Developers — Ride Requests introduction: <https://developer.uber.com/docs/riders/ride-requests/introduction>
- Uber Developers — Riders API introduction: <https://developer.uber.com/docs/riders/introduction>
- Gobierno de la Ciudad de Buenos Aires — BA Taxi: <https://buenosaires.gob.ar/gcaba_historico/infraestructura/movilidad/taxis/ba-taxi>
- Gobierno de la Ciudad de Buenos Aires — API Transporte: <https://api-transporte.buenosaires.gob.ar/>
- PIDA SU REMIS: <http://pidasuremis.com.ar/>

### Evidencia del repositorio

- `src/pages/TripFlow.tsx`
- `src/utils/addresses.ts`
- `src/utils/intent.ts`
- `src/utils/storage.ts`
- `src/types/index.ts`
- `src/main.tsx`
- `src/pages/FlowPage.tsx`
- `src/pages/CinemaFlow.tsx`
- `src/services/accountData.ts`
