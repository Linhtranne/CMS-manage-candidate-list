FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @cms/api --frozen-lockfile --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN ./apps/api/node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma
RUN ./apps/api/node_modules/.bin/tsc -p apps/api/tsconfig.build.json
RUN node apps/api/scripts/fix-generated-esm.mjs
RUN pnpm deploy --filter @cms/api --prod --legacy --ignore-scripts=false /prod

FROM node:22-alpine AS runner
# The base image's bundled npm has vulnerable transitive tooling; pin patched npm deps in the final image.
RUN npm install --global --ignore-scripts npm@12.0.2 ip-address@10.5.0 brace-expansion@5.0.9 undici@8.10.0 tar@7.5.21 \
    && cp -R /usr/local/lib/node_modules/brace-expansion/. /usr/local/lib/node_modules/npm/node_modules/brace-expansion/ \
    && cp -R /usr/local/lib/node_modules/ip-address/. /usr/local/lib/node_modules/npm/node_modules/ip-address/ \
    && cp -R /usr/local/lib/node_modules/undici/. /usr/local/lib/node_modules/npm/node_modules/undici/ \
    && cp -R /usr/local/lib/node_modules/tar/. /usr/local/lib/node_modules/npm/node_modules/tar/
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
RUN addgroup --system --gid 1001 cms && adduser --system --uid 1001 cms
COPY --from=builder --chown=cms:cms /app/apps/api/dist ./dist
COPY --from=builder --chown=cms:cms /app/apps/api/prisma ./prisma
COPY --from=builder --chown=cms:cms /prod/node_modules ./node_modules
COPY --from=builder --chown=cms:cms /prod/package.json ./package.json
USER cms
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "dist/bootstrap/api.js"]
