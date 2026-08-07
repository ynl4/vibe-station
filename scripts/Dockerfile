# Vibe Station — Production Docker Image
# Build:  docker build -t vibe-station -f scripts/Dockerfile .
# Run:    docker run -d -p 3000:3000 --name vibe-station \
#           --volume $(pwd)/data:/app/data \
#           --env DEEPSEEK_API_KEY=sk-xxx \
#           --env ACCESS_TOKEN=your-token \
#           vibe-station

# ── Build Stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm

WORKDIR /app

# Layer 1: workspace config + lockfile (cached unless deps change)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/ai-core/package.json packages/ai-core/

RUN pnpm install --frozen-lockfile

# Layer 2: source code
COPY packages/ packages/
COPY apps/ apps/

RUN pnpm build

# ── Production Stage ─────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy built Nuxt/Nitro output
COPY --from=build /app/apps/web/.output /app/.output

# Copy workspace deps needed at runtime (better-sqlite3 native module)
COPY --from=build /app/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=build /app/node_modules/better-sqlite3 /app/node_modules/better-sqlite3
COPY --from=build /app/packages/db /app/packages/db
COPY --from=build /app/packages/shared /app/packages/shared
COPY --from=build /app/packages/ai-core /app/packages/ai-core
COPY --from=build /app/apps/web/node_modules /app/apps/web/node_modules

# Copy workspace root files needed for module resolution
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml

# Ensure data directory exists
RUN mkdir -p /app/data

ENV DB_PATH=/app/data/vibe-station.db
ENV NITRO_PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/github-stats || exit 1

CMD ["node", ".output/server/index.mjs"]
