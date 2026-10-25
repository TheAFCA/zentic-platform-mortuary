# ZENTIC.pro / Homena — guía para agentes

SaaS multi-tenant para funerarias. Monorepo pnpm:

- `apps/api` — NestJS 11 + Prisma 5 (PostgreSQL) + Redis + socket.io. Jest.
- `apps/web` — Angular 21 (standalone, signals) + Angular Material + Tailwind 3. Vitest vía `ng test`.
- `packages/shared-types` — tipos compartidos (`@zentic/shared-types`). Su `dist/` está gitignored: si aparece "no exported member", correr `npx tsc -p packages/shared-types`.
- `prisma/` — schema, migraciones y seed en la raíz del repo.

Idioma: código y nombres en inglés; comentarios, mensajes de error al usuario y commits en español.

## Comandos

```bash
docker compose up -d            # Postgres :5545, shadow :5546, Redis :6379
pnpm dev:api / pnpm dev:web     # :3000 / :4200
cd apps/api && pnpm lint && pnpm test:cov   # umbral de cobertura: 90% líneas
cd apps/web && pnpm lint && npx ng test --watch=false
pnpm prisma:migrate             # nueva migración (dev)
```

CI usa **pnpm 10** (`.github/workflows/ci.yml`). pnpm 11 ignora el campo `pnpm` de `package.json` y reescribe el lockfile: no commitear un `pnpm-lock.yaml` regenerado por pnpm 11.

## Git

- Flujo: `feature/<alcance>` → PR a `dev` → PR `dev` → `main`. CI rechaza cualquier otra combinación. Nunca commitear directo a `main` ni `dev`.
- Conventional Commits: `feat(obituary): ...`, `fix(streaming): ...`.

## Backend: reglas que no se rompen

- **Aislamiento por tenant.** Todo controller de tenant usa `@UseGuards(JwtAuthGuard, TenantGuard, TenantModuleGuard, PermissionGuard)` + `@RequireModule(...)` + `@RequirePermission(...)` y obtiene el tenant con `@TenantId()`. Toda query del repositorio filtra por `tenantId`. El tenant se resuelve en `tenant.middleware.ts` (subdominio o header `x-tenant-slug`) y `TenantGuard` lo contrasta con el JWT.
- Super admin impersonando un tenant no puede ejecutar `DELETE` (lo impone `TenantGuard`).
- Endpoints públicos: `@Public()`. Revisar dos veces qué datos exponen.
- Capas: controller (HTTP/DTO) → service (reglas de negocio) → repository (Prisma). Sin Prisma en controllers.
- DTOs con `class-validator`; el `ValidationPipe` global usa `whitelist` + `forbidNonWhitelisted`.
- HTML de usuario (biografías, etc.) pasa por `sanitize-html` antes de persistir. Texto interpolado en SVG pasa por `escapeXml`.
- Uploads con `FilesService` (disco local temporal, pendiente migrar a R2/S3).
- Logs estructurados JSON (`JsonLoggerService`); errores 5xx a Sentry. Variables de entorno nuevas: `config/env.validation.ts` + `.env.example`.
- BD: el schema usa los nombres de Prisma tal cual (modelos `PascalCase`, campos `camelCase`, sin `@map`), aunque el README diga `snake_case`. Mantener lo existente.

## Frontend

- Atomic design en `shared/atoms|molecules|organisms`; features en `app/modules/<dominio>`.
- Sistema visual "warm-minimal": tokens en `apps/web/src/styles.scss` (`:root`) y `tailwind.config.js`. Usar tokens (`--brand-*`, `--radius-*`, `--shadow-*`), no hex sueltos. `--brand-*` es el default que cada tenant puede sobrescribir.
- No usar `bypassSecurityTrust*` salvo para URLs de proveedores de streaming ya validadas.
