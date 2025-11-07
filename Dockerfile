FROM node:20-bullseye-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* ./

ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate

RUN pnpm build

FROM node:20-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY docker-entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 3005

ENTRYPOINT ["/entrypoint.sh"]
CMD ["pnpm", "start"]
