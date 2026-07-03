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

# 5. Ejecutar migraciones y seed
pnpm prisma:migrate
pnpm prisma:seed

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
| `pnpm prisma:migrate` | Ejecutar migraciones pendientes |
| `pnpm prisma:seed` | Insertar datos iniciales |
| `pnpm prisma:studio` | Abrir Prisma Studio (BD visual) |

## Documentación técnica

Los módulos de diseño y funcionalidades están en `/mds/`:

| Archivo | Contenido |
|---|---|
| `01_ARQUITECTURA_GENERAL.md` | Stack técnico, estructura de carpetas |
| `02_MODULO_LOGIN_REGISTRO.md` | Autenticación y registro |
| `03_MODULO_ROLES_PERMISOS.md` | RBAC y permisos granulares |
| `04_MODULO_SUPER_ADMIN.md` | Panel de plataforma |
| `05_MODULO_ADMIN_GENERAL.md` | Panel del tenant admin |
| `06_MODULO_STREAMING.md` | Transmisiones en vivo |
| `07_MODULO_OBITUARIOS.md` | Obituarios digitales |
| `13_MODULO_LEADS.md` | Mini-CRM de leads |
| `18_LINEAMIENTOS_DESARROLLO.md` | Estándares de código y calidad |

## Convención de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org):

```
feat(streaming): add waiting room countdown timer
fix(auth): prevent refresh token reuse after logout
test(leads): add unit tests for LeadsService.convert
docs(api): update endpoint table in module doc
```

## Acceso inicial (desarrollo)

- **Super Admin:** `superadmin@zentic.pro` / `Zentic2026!`
- **Tenant Admin (demo):** `admin@demo-funeraria.zentic.pro` / `Demo2026!`
- **Swagger API:** http://localhost:3000/api/docs
- **Prisma Studio:** `pnpm prisma:studio` → http://localhost:5555
