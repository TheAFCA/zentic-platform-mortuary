FROM node:20-alpine AS build
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web
RUN pnpm --filter @zentic/shared-types build
RUN pnpm --filter @zentic/web build:prod

FROM nginx:alpine AS runner
COPY --from=build /app/apps/web/dist/web/browser /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
