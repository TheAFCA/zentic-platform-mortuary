FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api
RUN pnpm --filter @zentic/shared-types build
RUN pnpm prisma generate
RUN pnpm --filter @zentic/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY prisma ./prisma

RUN mkdir -p node_modules/@zentic && \
    ln -s /app/packages/shared-types node_modules/@zentic/shared-types

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
