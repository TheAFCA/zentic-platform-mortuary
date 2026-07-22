# Decisión de alcance para streaming

Fecha: 2026-07-16

## Decisión

La implementación de streaming se mantendrá centrada en Mux como proveedor activo.

## Alcance actual

- La fase en curso debe resolver reproducción, emisión, estados y pruebas sobre Mux.
- El código debe conservar una abstracción de proveedor para permitir futuras integraciones.
- El trabajo de extensibilidad futura no debe mezclarse con la validación funcional de esta fase.

## Fuera de alcance por ahora

- Integración operativa con Cloudflare u otros proveedores.
- Validaciones, pruebas E2E o fixtures específicos de proveedores adicionales.
- Ajustes de comportamiento condicionados a varios proveedores activos al mismo tiempo.

## Implicaciones

- El contrato de proveedor debe permanecer estable y desacoplado del dominio.
- Las decisiones de UI, API y pruebas deben describir el comportamiento esperado con Mux.
- Cualquier soporte nuevo de otro proveedor se tratará como trabajo posterior, con su propio backlog.

## Referencia

- [Plan de acción para la implementación de streaming](./streaming-action-plan.md)
