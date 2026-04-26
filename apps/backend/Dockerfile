FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/
COPY apps/mobile/package.json apps/mobile/
COPY apps/web/package.json apps/web/
COPY contracts/package.json contracts/
COPY packages/config/package.json packages/config/
COPY packages/graphql-schema/package.json packages/graphql-schema/
COPY packages/types/package.json packages/types/
COPY apps/backend/prisma apps/backend/prisma
RUN bun install --production --frozen-lockfile
COPY apps/backend/src apps/backend/src
COPY apps/backend/tsconfig.json apps/backend/
WORKDIR /app/apps/backend
RUN bunx prisma generate
RUN bun build src/main.ts --target bun --outdir dist
EXPOSE 4000
CMD ["bun", "run", "dist/main.js"]
