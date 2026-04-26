import "reflect-metadata";

import type { IncomingMessage } from "node:http";

import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import helmet from "helmet";
import cors from "cors";

import { AppModule } from "./app.module";

type RawBodyRequest = IncomingMessage & {
  body?: Buffer;
  headers: Record<string, string | string[] | undefined>;
};

const express = {
  raw:
    ({ type }: { type: string }) =>
    (
      request: RawBodyRequest,
      _response: unknown,
      next: (error?: unknown) => void,
    ) => {
      const contentType = request.headers["content-type"];
      const normalizedContentType = Array.isArray(contentType)
        ? contentType[0]
        : contentType;

      if (!normalizedContentType?.includes(type)) {
        next();
        return;
      }

      if (Buffer.isBuffer(request.body)) {
        next();
        return;
      }

      const chunks: Buffer[] = [];
      request.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      request.on("end", () => {
        request.body = Buffer.concat(chunks);
        next();
      });
      request.on("error", next);
    },
};

function validateDatabaseUrlOrExit() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(
      "[startup] DATABASE_URL is missing. Set a full Postgres URL before starting the backend.",
    );
    process.exit(1);
  }

  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    console.error(
      `[startup] DATABASE_URL must start with postgresql:// or postgres://. Current value starts with: ${databaseUrl.split(":")[0] || "<empty>"}`,
    );
    process.exit(1);
  }

  try {
    const parsed = new URL(databaseUrl);
    if (!parsed.hostname) {
      throw new Error("missing hostname");
    }

    const databaseName = parsed.pathname.replace(/^\//, "");
    if (!databaseName) {
      throw new Error("missing database name in path");
    }

    if (parsed.port) {
      const port = Number(parsed.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("invalid port number");
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[startup] DATABASE_URL is malformed (${message}). Example: postgresql://user:password@host:5432/database`,
    );
    process.exit(1);
  }
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function resolvePublicBaseUrl(port: string | number): string {
  const configuredUrl =
    process.env.APP_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL;

  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  return `http://localhost:${port}`;
}

function resolveRuntimeEnvironment(): string {
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }

  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
    return "production";
  }

  return "development";
}

async function bootstrap() {
  validateDatabaseUrlOrExit();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix("api/v1", {
    exclude: ["/graphql", "graphql", "/payments/webhook", "payments/webhook"],
  });
  app.use("/payments/webhook", express.raw({ type: "application/json" }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
    }),
  );
  app.use(helmet());
  const allowedOrigins = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.CORS_ORIGIN,
    "https://coopenergie-backend.vercel.app",
    "http://localhost:3000",
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
      },
      credentials: true,
    }),
  );

  // Request logging middleware
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const originalSend = res.send;

    res.send = function (data: any) {
      const duration = Date.now() - start;
      const method = req.method;
      const url = req.originalUrl;
      const status = res.statusCode;
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // Extract endpoint name from URL
      const pathSegments = url.split("?")[0].split("/").filter(Boolean);
      let endpointName = "unknown";

      // Extract meaningful endpoint name
      if (pathSegments[0] === "graphql") {
        endpointName = "graphql";
      } else if (pathSegments.length >= 3) {
        // Remove 'api' and 'v1' prefixes if present
        const relevantSegments = pathSegments.slice(
          pathSegments[0] === "api" ? 2 : 1,
        );

        // Get the main resource (first segment after prefix)
        if (relevantSegments[0]) {
          endpointName = relevantSegments[0];

          // For nested routes, append the action
          if (
            relevantSegments.length > 1 &&
            !relevantSegments[1].startsWith(":")
          ) {
            endpointName = `${endpointName}.${relevantSegments[1]}`;
          }
        }
      }

      const statusColor =
        status >= 500
          ? "\x1b[31m"
          : status >= 400
            ? "\x1b[33m"
            : status >= 300
              ? "\x1b[36m"
              : "\x1b[32m";
      const resetColor = "\x1b[0m";

      console.log(
        `[${timestamp}] [${endpointName}] ${method} ${url} ${statusColor}${status}${resetColor} ${duration}ms`,
      );

      return originalSend.call(this, data);
    };

    next();
  });

  const port = process.env.PORT || process.env.API_PORT || 4000;
  const nodeEnv = resolveRuntimeEnvironment();
  const publicBaseUrl = resolvePublicBaseUrl(port);
  const graphqlUrl = `${publicBaseUrl}/graphql`;

  await app.listen(port, () => {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║       🚀 CoopEnergie Backend Server Started 🚀         ║");
    console.log("╚════════════════════════════════════════════════════════╝");
    console.log(`\n  ✓ Environment:     ${nodeEnv}`);
    console.log(`  ✓ Server running on: ${publicBaseUrl}`);
    console.log(`  ✓ GraphQL endpoint:  ${graphqlUrl}`);
    console.log(`  ✓ API prefix:        /api/v1`);
    console.log(
      `  ✓ Database:        ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`,
    );
    console.log(
      `  ✓ Redis:           ${process.env.REDIS_URL ? "Connected" : "Not configured"}`,
    );
    console.log(
      `  ✓ JWT enabled:     ${process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET ? "Yes" : "No"}`,
    );
    console.log("\n  Ready to handle requests...\n");
  });
}

bootstrap();
