# ─── Stage 1: Dependencies ──────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache git
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ─── Stage 3: Run ───────────────────────────────────────────────────────────
FROM node:22-alpine AS run
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npx drizzle-kit push && node server.js"]
