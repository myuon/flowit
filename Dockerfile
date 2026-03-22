FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/db/package.json apps/db/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/
RUN pnpm install --frozen-lockfile

# Build all packages
FROM deps AS build
COPY . .
RUN pnpm -r run build

# Production dependencies only
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/db/package.json apps/db/
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/
RUN pnpm install --frozen-lockfile --prod

# Final image
FROM node:20-slim
WORKDIR /app
COPY --from=prod-deps /app/ ./
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/db/dist apps/db/dist
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/apps/worker/dist apps/worker/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/sdk/dist packages/sdk/dist
COPY start.sh .
RUN chmod +x start.sh
ENV PORT=8080
EXPOSE 8080
CMD ["./start.sh"]
