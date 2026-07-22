# Plan de acción para la implementación de streaming

## Contexto

Este documento transforma los hallazgos de la auditoría del módulo de streaming en un backlog de correcciones y mejoras priorizadas.

El módulo no debe considerarse listo para producción hasta completar las fases de seguridad, aislamiento multi-tenant, reproducción y consistencia del ciclo de vida.

La decisión de mantener esta fase enfocada en Mux, con extensibilidad futura preparada pero fuera de alcance, está documentada en [streaming-provider-decision.md](./streaming-provider-decision.md).

## Objetivos

- Proteger eventos, grabaciones y canales WebSocket privados.
- Evitar exposición de credenciales de transmisión.
- Garantizar el aislamiento de datos entre tenants.
- Habilitar la reproducción HLS real con Mux.
- Dejar la abstracción lista para sumar otros proveedores en el futuro sin mezclar ese trabajo con la fase actual.
- Hacer que las transiciones del stream sean atómicas e idempotentes.
- Preparar WebSocket, rate limiting y presencia para múltiples réplicas.
- Aumentar la cobertura mediante pruebas de seguridad, integración y E2E.

## Definición de prioridades

| Prioridad | Significado                                                  |
| --------- | ------------------------------------------------------------ |
| P0        | Bloquea producción; riesgo crítico de seguridad o privacidad |
| P1        | Riesgo alto o funcionalidad principal defectuosa             |
| P2        | Mejora necesaria de resiliencia, escalabilidad o experiencia |
| P3        | Optimización o deuda técnica no bloqueante                   |

## Fase 0: contención inmediata

Estas tareas bloquean cualquier salida a producción.

- [x] **SEC-01 (P0):** Deshabilitar `join-admin` para clientes no autenticados.
  - Criterio cumplido: un socket anónimo no puede entrar a una sala administrativa.
- [x] **SEC-02 (P0):** Ocultar `streamKey`, `accessCode`, `providerStreamId` y `rtmpUrl` de las respuestas generales.
  - Criterio cumplido: un usuario con `streaming:read` no recibe credenciales ni hashes.
- [x] **SEC-03 (P0):** Impedir la cancelación de eventos `LIVE` o `PAUSED`.
  - Criterio cumplido: la API responde con 409 y mantiene activo el stream.
- [x] **SEC-04 (P0):** Añadir rate limiting a códigos de acceso, mensajes y reacciones.
  - Criterio cumplido: la API responde con 429 al superar los límites configurados.
- [x] **SEC-05 (P0):** Eliminar el bypass de acceso para eventos privados finalizados.
  - Criterio cumplido: una grabación privada sigue requiriendo autorización.

## Fase 1: seguridad y acceso privado

### Autorización de espectadores

- [x] **SEC-06:** Diseñar un token de acceso temporal limitado a un evento.
- [x] **SEC-07:** Hacer que `POST /events/:slug/access` entregue un token firmado con `eventId`, alcance y expiración.
- [x] **SEC-08:** Transportar el token mediante una cookie `HttpOnly`, `Secure` y `SameSite`, o mediante un bearer token efímero documentado.
- [x] **SEC-09:** Validar el token al consultar eventos privados, consultar o enviar mensajes, enviar reacciones, reproducir contenido y conectarse por WebSocket.
- [x] **SEC-10:** Separar la metadata pública mínima de los datos protegidos del difunto.
- [x] **SEC-11:** Evitar que `findPublic()` entregue directamente una `recordingUrl` privada.
- [x] **SEC-12:** Generar playback URLs firmadas y de corta duración para contenido privado.

Implementación Mux: los eventos privados se aprovisionan con playback policy `signed`; la API genera JWT de video de corta duración únicamente después de validar la cookie de acceso del evento.

**Criterio de salida:** conocer el slug o el `eventId` no permite acceder a información, video, grabaciones o eventos WebSocket privados.

### Seguridad WebSocket

- [x] **WS-01:** Autenticar sockets administrativos mediante JWT durante el handshake.
- [x] **WS-02:** Validar tenant y permiso `streaming:moderate` antes de ejecutar `join-admin`.
- [x] **WS-03:** Validar la existencia del evento y la autorización del espectador antes de ejecutar `join-event`.
- [x] **WS-04:** Validar payloads WebSocket mediante DTOs o pipes.
- [x] **WS-05:** Restringir CORS WebSocket a los orígenes configurados.
- [x] **WS-06:** Limitar la cantidad de salas que puede solicitar un socket.
- [x] **WS-07:** Entregar errores de autorización sin revelar la existencia de eventos privados.

### Credenciales de emisión

- [x] **SEC-13:** Crear DTOs de respuesta explícitos para lista, detalle, administración y vistas públicas.
- [x] **SEC-14:** Crear un endpoint separado para obtener credenciales RTMP.
- [x] **SEC-15:** Proteger el endpoint de credenciales con `streaming:manage`.
- [x] **SEC-16:** Registrar quién consultó, copió o regeneró una stream key.
- [x] **SEC-17:** Enmascarar la stream key y revelarla solo mediante una acción explícita.
- [x] **SEC-18:** Permitir la rotación de la stream key.

**Fase 1 completada:** la implementación automatizada y sus pruebas están aprobadas. La validación smoke contra una cuenta Mux real requiere configurar las credenciales y signing keys del entorno.

## Fase 2: aislamiento multi-tenant

| ID     | Corrección                                                    | Criterio de aceptación                                                | Estado                                                              |
| ------ | ------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| TEN-01 | Corregir la validación invertida de `deceasedId`              | Solo se pueden usar difuntos del tenant autenticado                   | ✅ Completado                                                       |
| TEN-02 | Validar `roomId`, `clientId` y `assignedToId` al crear        | Un ID de otro tenant produce 404 o 400                                | ✅ Completado                                                       |
| TEN-03 | Repetir las validaciones al actualizar                        | No se pueden cambiar relaciones hacia otro tenant                     | ✅ Completado                                                       |
| TEN-04 | Incluir `tenantId` en todas las escrituras del repositorio    | Actualización, eliminación y moderación quedan delimitadas por tenant | ✅ Completado                                                       |
| TEN-05 | Revisar mensajes, leads, obituarios y webhooks relacionados   | Ninguna relación puede cruzar tenants                                 | ✅ Completado                                                       |
| TEN-06 | Añadir índices y restricciones compuestas cuando sean viables | La base de datos refuerza el aislamiento                              | ✅ Completado (índices compuestos en Event y EventStateTransition) |
| TEN-07 | Añadir pruebas negativas con al menos dos tenants             | Todos los intentos cruzados son rechazados                            | 🔄 Parcial (unitarias con mocks, falta integración real PostgreSQL) |

La escritura final debe incluir la frontera de tenant; no es suficiente consultar el recurso y posteriormente actualizarlo solo por `id`.

**Avance:** 6/7 tareas implementadas. TEN-06 completado (índices compuestos añadidos al esquema Prisma). TEN-07 parcial: existen pruebas unitarias cross-tenant con mocks, pero falta una prueba real con dos tenants persistidos en PostgreSQL. Se corrigieron además: `updateViewerCount` con tenantId, `findApprovedMessages` de obituario con tenantId, y reorden de validaciones en `create()` para evitar difuntos huérfanos.

## Fase 3: reproducción real del stream con Mux

- [x] **PLAY-01:** Extender `CreateLiveStreamResult` con playback ID y playback URL.
- [x] **PLAY-02:** Añadir al modelo los campos necesarios para reproducción en vivo (`playbackId`, `playbackPolicy`).
- [x] **PLAY-03:** Guardar `playbackId`, `playbackPolicy` y `playbackUrl` al crear el recurso remoto.
- [x] **PLAY-04:** Implementar la obtención de HLS para Mux (via `getPlaybackUrl`).
- [x] **PLAY-05:** Mantener el contrato de reproducción preparado para futuros proveedores sin añadir otra integración en esta fase.
- [x] **PLAY-06:** Usar `playbackUrl` resuelto como `src` del video (tanto admin como público).
- [x] **PLAY-07:** Integrar `hls.js` con recuperación de errores, fallback HLS nativo y limpieza al cambiar/quitar la fuente o destruir el componente.
- [x] **PLAY-08:** Mostrar estados: conectando/live/sin-señal/reconectando/finalizado/error + modo live vs recording.
- [x] **PLAY-09:** Probar de forma automatizada la selección HLS nativa y `hls.js`, la limpieza de recursos, fuentes reemplazadas y recuperación de errores.
- [ ] **PLAY-10:** Validar el flujo completo con OBS, cuentas reales de Mux, Safari y un navegador basado en Chromium.

**Avance:** 9/10 tareas implementadas. PLAY-10 permanece pendiente porque necesita infraestructura y navegadores reales; se trata de una validación externa, no de una deuda de implementación dentro de la fase.

**Criterio de salida:** OBS emite, el proveedor recibe la señal y un espectador autorizado puede reproducirla desde la página del evento.

## Fase 4: ciclo de vida y consistencia

### Máquina de estados

La implementación debe permitir únicamente estas transiciones:

```text
SCHEDULED -> LIVE -> FINISHED
                \-> PAUSED -> LIVE
SCHEDULED -> CANCELLED
LIVE/PAUSED -> INTERRUPTED
```

- [x] **LIFE-01:** Formalizar la máquina de estados en una única capa de dominio.
- [x] **LIFE-02:** Implementar transiciones atómicas condicionadas por el estado actual.
- [x] **LIFE-03:** Hacer que `startStream` sea idempotente.
- [x] **LIFE-04:** Hacer que `stopStream` sea idempotente.
- [x] **LIFE-05:** Evitar notificaciones y correos duplicados ante inicios concurrentes.
- [x] **LIFE-06:** Definir el comportamiento ante pérdida y recuperación de señal.
- [x] **LIFE-07:** Procesar webhooks `stream.active` y `stream.idle` para sincronizar estados.
- [x] **LIFE-08:** Registrar el historial de transiciones, usuario, origen y fecha.

### Aprovisionamiento y compensación

- [x] **LIFE-09:** Diseñar una saga para coordinar la creación local y remota.
- [x] **LIFE-10:** Eliminar o marcar como fallido el evento provisional cuando falle el proveedor.
- [x] **LIFE-11:** Eliminar el recurso remoto cuando falle la persistencia posterior.
- [x] **LIFE-12:** Añadir `PROVISIONING` y `PROVISION_FAILED` si el aprovisionamiento será asíncrono.
- [x] **LIFE-13:** Incorporar reintentos con backoff para fallos transitorios.
- [x] **LIFE-14:** Crear una tarea de reconciliación para detectar recursos huérfanos.

### Resolución del proveedor

- [x] **PROV-01:** Resolver el proveedor mediante `event.provider`, no mediante la configuración activa global.
- [x] **PROV-02:** Crear un registro o factory que soporte Mux hoy y permita sumar otros proveedores después sin tocar los flujos de dominio.
- [x] **PROV-03:** Rechazar de forma controlada proveedores desconocidos en datos históricos.
- [x] **PROV-04:** Validar `response.ok` en todas las operaciones del proveedor.
- [x] **PROV-05:** Añadir timeouts y errores externos tipados.
- [x] **PROV-06:** Diferenciar entre ausencia de señal e indisponibilidad del proveedor.

## Fase 5: agenda y salas

La intersección de horarios debe cumplir:

```text
existingStart < newEnd
AND
existingEnd > newStart
```

- [x] **SCHED-01:** Corregir el algoritmo de intersección.
- [x] **SCHED-02:** Calcular el final usando `estimatedDuration`.
- [x] **SCHED-03:** Definir el comportamiento para eventos sin duración (default 60 min).
- [x] **SCHED-04:** Validar solapamientos al modificar sala, fecha o duración.
- [x] **SCHED-05:** Excluir correctamente el evento actualizado.
- [x] **SCHED-06:** Proteger la operación contra creaciones simultáneas (transacción con retry P2034).
- [x] **SCHED-07:** Probar eventos anteriores, posteriores, contenidos, adyacentes y concurrentes.

## Fase 6: moderación y prevención de abuso

- [x] **MOD-01:** Implementar rate limiting distribuido con Redis.
- [x] **MOD-02:** Configurar límites diferentes para códigos, mensajes y reacciones.
- [x] **MOD-03:** Combinar IP, evento y sesión como clave de rate limiting.
- [x] **MOD-04:** ~~Añadir CAPTCHA o challenge después de varios códigos fallidos.~~ (bloqueado: requiere servicio externo; se deja infraestructura de rate-limit lista)
- [x] **MOD-05:** Exigir códigos con longitud y entropía mínimas.
- [x] **MOD-06:** Sustituir SHA-256 directo por HMAC con secreto o un hash adecuado para códigos humanos.
- [x] **MOD-07:** Limitar la longitud de autor, motivo de rechazo y campos de texto restantes.
- [x] **MOD-08:** Validar emails mediante `IsEmail`.
- [x] **MOD-09:** Validar tipo de ceremonia, URLs y duración mediante enums y restricciones.
- [x] **MOD-10:** Impedir mensajes y reacciones en estados no permitidos.
- [x] **MOD-11:** Añadir controles antispam y bloqueo de contenido repetido.
- [x] **MOD-12:** Impedir aprobar nuevamente mensajes aprobados, rechazados o eliminados.

## Fase 7: escalabilidad WebSocket

- [x] **SCALE-01:** Configurar el adaptador Redis de Socket.IO.
- [x] **SCALE-02:** Sustituir el contador local por presencia distribuida.
- [x] **SCALE-03:** Limpiar la sala anterior cuando un socket cambia de evento.
- [x] **SCALE-04:** Excluir correctamente a administradores del contador.
- [x] **SCALE-05:** Definir si varias pestañas cuentan como una o varias personas. (decisión: cada socket = un viewer; implementado vía Set local + Redis SADD)
- [x] **SCALE-06:** Sincronizar `viewerCount` en base de datos con frecuencia limitada.
- [x] **SCALE-07:** Evitar una escritura por cada conexión y desconexión.
- [ ] **SCALE-08:** Probar desconexiones abruptas, reconexiones y múltiples réplicas.

## Fase 8: grabaciones y privacidad

- [x] **REC-01:** Evitar URLs públicas permanentes para grabaciones privadas.
- [x] **REC-02:** Generar URLs firmadas bajo demanda.
- [x] **REC-03:** Aplicar realmente `recordingExpiry`.
- [x] **REC-04:** Crear una tarea programada de eliminación.
- [x] **REC-05:** Eliminar también el activo remoto cuando expire.
- [x] **REC-06:** Registrar y reintentar fallos de eliminación.
- [x] **REC-07:** Mostrar fecha de expiración y estado al administrador.
- [x] **REC-08:** Permitir conservación o eliminación manual según permisos y plan.

## Fase 9: consentimiento y datos personales

- [x] **DATA-01:** No crear leads con información personal sin consentimiento válido.
- [x] **DATA-02:** Enviar notificaciones únicamente a leads con `consent: true`.
- [x] **DATA-03:** Guardar fecha, versión y origen del consentimiento.
- [x] **DATA-04:** Añadir una opción explícita para aceptar notificaciones.
- [x] **DATA-05:** Evitar que el frontend envíe siempre `consent: true`.
- [x] **DATA-06:** Implementar el retiro del consentimiento.
- [x] **DATA-07:** Definir retención para leads, mensajes y direcciones IP.

## Fase 10: Angular y experiencia de usuario

- [x] **WEB-01:** Usar `takeUntilDestroyed()` en todas las suscripciones.
- [x] **WEB-02:** Desconectar el socket al destruir la página pública y el detalle.
- [x] **WEB-03:** Sustituir `canManage()` y `canModerate()` constantes por permisos reales.
- [x] **WEB-04:** Ocultar credenciales y acciones cuando el usuario no tenga permisos.
- [x] **WEB-05:** Cargar mensajes aprobados existentes al abrir la página pública.
- [x] **WEB-06:** Evitar duplicados entre carga inicial y eventos WebSocket.
- [x] **WEB-07:** Implementar reconexión con recuperación del último evento recibido.
- [x] **WEB-08:** Mostrar correctamente los errores entregados por el backend.
- [x] **WEB-09:** Añadir estados accesibles de carga y feedback del reproductor.
- [x] **WEB-10:** Corregir la advertencia Angular `NG8102`.

## Fase 11: pruebas obligatorias

### Backend

- [x] Acceso privado con token válido, inválido y expirado.
- [x] Acceso WebSocket anónimo, autorizado y administrativo.
- [ ] Intentos de crear relaciones entre dos tenants.
- [ ] Ausencia de credenciales en cada tipo de respuesta.
- [ ] Inicio y finalización concurrentes.
- [ ] Fallos de Mux en cada etapa.
- [ ] Compensación de recursos huérfanos.
- [ ] Resolución del proveedor con eventos históricos.
- [ ] Solapamientos y concurrencia de salas.
- [ ] Rate limiting distribuido.
- [ ] Expiración de grabaciones.
- [ ] Consentimiento y notificaciones de leads.

### Frontend y E2E

- [ ] Evento público programado.
- [ ] Evento público en vivo.
- [ ] Evento privado con y sin acceso.
- [ ] Grabación privada finalizada.
- [ ] Operador con y sin `streaming:manage`.
- [ ] Moderador con y sin `streaming:moderate`.
- [ ] Reconexión durante una transmisión.
- [ ] Reproducción HLS real.
- [ ] Múltiples espectadores y pestañas.
- [ ] Navegación repetida sin sockets ni suscripciones residuales.

Se debe retirar `!modules/streaming/**` de la configuración de cobertura de la API y establecer un umbral específico para el módulo.

## Orden recomendado de ejecución

1. Completar `SEC-01` a `SEC-18` y `WS-01` a `WS-07`.
2. Completar `TEN-01` a `TEN-07`.
3. Completar `PLAY-01` a `PLAY-10`.
4. Completar `LIFE-*` y `PROV-*`.
5. Completar `SCHED-*`, `MOD-*` y `SCALE-*`.
6. Completar `REC-*` y `DATA-*`.
7. Completar `WEB-*`.
8. Ejecutar pruebas E2E, de carga y validación con Mux real.

## Puerta de salida a producción

La salida a producción queda bloqueada hasta que se cumplan estas condiciones:

- Las fases 0 a 4 están completas.
- No existen vulnerabilidades P0 o P1 abiertas.
- Los eventos privados están protegidos en REST, WebSocket y playback.
- Ninguna respuesta de lectura general expone credenciales.
- Las pruebas multi-tenant negativas están aprobadas.
- La reproducción HLS fue validada con Mux.
- Las transiciones de estado superan pruebas concurrentes e idempotentes.
- Existe monitoreo de errores de proveedor, webhooks y recursos huérfanos.

## Seguimiento

| Campo                | Valor       |
| -------------------- | ----------- |
| Estado               | Propuesto   |
| Responsable          | Por asignar |
| Fecha objetivo       | Por definir |
| Última actualización | 2026-07-17  |
