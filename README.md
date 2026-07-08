# ZENTIC.pro — Plataforma SaaS para Funerarias

Monorepo del sistema multi-tenant ZENTIC.pro. Incluye el backend API (NestJS) y el frontend SPA (Angular).

## Estructura

```
zentic-platform/
├── apps/
│   ├── api/          # NestJS backend — Puerto 3000
│   └── web/          # Angular frontend — Puerto 4200
├── packages/
│   └── shared-types/ # Tipos TypeScript compartidos
├── prisma/           # Schema y migraciones de PostgreSQL
└── docker-compose.yml
```

## Pre-requisitos

- [Node.js 20 LTS](https://nodejs.org)
- [pnpm 10+](https://pnpm.io) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Setup local (primera vez)

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd zentic-platform

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores locales

# 4. Levantar PostgreSQL y Redis
docker compose up -d

# Postgres: localhost:5545
# Shadow DB: localhost:5546
# Redis: localhost:6379

# 5. Ejecutar migraciones y seed
pnpm prisma:migrate
pnpm prisma:seed

# Si solo necesitas aplicar migraciones ya existentes sin prompts:
# pnpm prisma:migrate:prod

# 6. Iniciar en modo desarrollo
pnpm dev:api   # NestJS en :3000
pnpm dev:web   # Angular en :4200
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev:api` | Backend en modo watch |
| `pnpm dev:web` | Frontend en modo watch |
| `pnpm build` | Build de producción (ambos) |
| `pnpm test` | Tests unitarios (ambos) |
| `pnpm lint` | Lint (ambos) |
| `pnpm lint:fix` | Auto-fix de lint (ambos) |
| `pnpm prisma:migrate` | Ejecutar migraciones pendientes |
| `pnpm prisma:seed` | Insertar datos iniciales |
| `pnpm prisma:studio` | Abrir Prisma Studio (BD visual) |

## Staging

- El despliegue a staging se dispara automáticamente cuando `CI` termina bien en `dev`.
- El workflow `Deploy Staging` llama a los deploy hooks de Render para API y Web.
- Secrets requeridos en GitHub:
  - `RENDER_API_DEPLOY_HOOK_URL`
  - `RENDER_WEB_DEPLOY_HOOK_URL`
- Observabilidad base:
  - API: `SENTRY_DSN` y `SENTRY_ENVIRONMENT`.
  - Web: `apps/web/src/environments/environment*.ts` incluye `sentryDsn` y `sentryEnvironment`.
  - Logs de API en JSON por consola.
  - En local hay un panel de prueba en la web con botones para enviar eventos frontend y backend.
- El workflow también puede ejecutarse manualmente desde GitHub Actions.

## Documentación técnica

La documentación técnica del producto se irá consolidando por HU. Para esta base, el archivo de seguimiento es `HU1_CHECKLIST.md`.

## Observabilidad

- Los errores 5xx de API se reportan a Sentry cuando hay `SENTRY_DSN` configurado.
- El frontend Angular inicializa Sentry antes del bootstrap y captura errores globales con `ErrorHandler`.
- Los errores HTTP del cliente se reenvían a Sentry solo para respuestas `>= 500`.

## Convención de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org):

```
feat(streaming): add waiting room countdown timer
fix(auth): prevent refresh token reuse after logout
test(leads): add unit tests for LeadsService.convert
docs(api): update endpoint table in module doc
```

## Git Flow

- `main` es la rama productiva.
- `dev` es la rama de integración obligatoria antes de `main`.
- Las ramas de trabajo salen desde `dev` usando `feature/<alcance>`.
- Ejemplo: `feature/hu1-config-base`.
- No se deben hacer commits directos a `main` ni a `dev`.
- Los cambios deben entrar por pull request y revisión previa.

## Convenciones de nombres

- Carpetas en `kebab-case` o `lowercase` consistente.
- Componentes Angular con sufijo `.component.ts`.
- Rutas y módulos por dominio de negocio.
- Tipos compartidos en `packages/shared-types` con nombres `PascalCase`.
- Tablas y columnas de base de datos en `snake_case`.

## Acceso inicial (desarrollo)

- **Super Admin:** `superadmin@zentic.pro` / `Zentic2026!`
- **Tenant Admin (demo):** `admin@demo-funeraria.zentic.pro` / `Demo2026!`
- **Tenant Login local:** http://demo-funeraria.localhost:4200/auth/login
- **Super Admin Login local:** http://localhost:4200/super-admin/login
- **Swagger API:** http://localhost:3000/api/docs
- **Prisma Studio:** `pnpm prisma:studio` → http://localhost:5555
