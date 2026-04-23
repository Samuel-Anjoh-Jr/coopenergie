FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/
COPY apps/backend/prisma apps/backend/prisma
RUN bun install --production
COPY apps/backend/src apps/backend/src
COPY apps/backend/tsconfig.json apps/backend/
WORKDIR /app/apps/backend
RUN bunx prisma generate
RUN bun build src/main.ts --target bun --outdir dist
EXPOSE 4000
CMD ["bun", "run", "dist/main.js"]
