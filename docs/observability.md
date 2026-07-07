# Observability

- API: inicializa Sentry con `SENTRY_DSN` y `SENTRY_ENVIRONMENT`.
- API: loguea en JSON para facilitar ingestión por plataformas externas.
- Web: inicializa Sentry antes de `bootstrapApplication`.
- Web: usa `ErrorHandler` de Sentry y captura errores HTTP `>= 500`.
