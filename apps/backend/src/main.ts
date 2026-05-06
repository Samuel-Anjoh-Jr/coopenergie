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

function parseIntegerEnvOrExit(
  name: string,
  value: string | undefined,
  fallback: number,
) {
  const candidate = value?.trim() ? value.trim() : String(fallback);
  const parsed = Number.parseInt(candidate, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(
      `[startup] ${name} must be a positive integer. Received: ${value}`,
    );
    process.exit(1);
  }

  return parsed;
}

function validateCampayConfigOrExit() {
  const isProductionLike =
    process.env.NODE_ENV === "production" ||
    !!process.env.RAILWAY_ENVIRONMENT ||
    !!process.env.RAILWAY_PROJECT_ID;
  const hasAnyCampayValue = Object.keys(process.env).some((key) =>
    key.startsWith("CAMPAY_"),
  );

  if (!isProductionLike && !hasAnyCampayValue) {
    return;
  }

  const apiBaseUrl =
    process.env.CAMPAY_API_BASE_URL?.trim() ||
    process.env.CAMPAY_BASE_URL?.trim() ||
    "https://demo.campay.net/api";
  const token =
    process.env.CAMPAY_PERMANENT_TOKEN?.trim() ||
    process.env.CAMPAY_API_KEY?.trim();
  const webhookKey =
    process.env.CAMPAY_WEBHOOK_KEY?.trim() ||
    process.env.CAMPAY_WEBHOOK_SECRET?.trim();
  const refundEnabled = (process.env.CAMPAY_REFUND_ENABLED || "false").trim();

  try {
    const parsedUrl = new URL(apiBaseUrl);
    if (!parsedUrl.protocol.startsWith("http")) {
      throw new Error("invalid protocol");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[startup] CAMPAY_API_BASE_URL/CAMPAY_BASE_URL must be a valid URL (${message}).`,
    );
    process.exit(1);
  }

  if (!token) {
    console.error(
      "[startup] CAMPAY_PERMANENT_TOKEN or CAMPAY_API_KEY is required.",
    );
    process.exit(1);
  }

  if (!webhookKey) {
    console.error(
      "[startup] CAMPAY_WEBHOOK_KEY or CAMPAY_WEBHOOK_SECRET is required.",
    );
    process.exit(1);
  }

  if (refundEnabled !== "true" && refundEnabled !== "false") {
    console.error(
      `[startup] CAMPAY_REFUND_ENABLED must be 'true' or 'false'. Received: ${refundEnabled}`,
    );
    process.exit(1);
  }

  parseIntegerEnvOrExit(
    "CAMPAY_REQUEST_TIMEOUT",
    process.env.CAMPAY_REQUEST_TIMEOUT,
    30000,
  );
  parseIntegerEnvOrExit(
    "CAMPAY_MAX_RETRIES",
    process.env.CAMPAY_MAX_RETRIES,
    3,
  );
  parseIntegerEnvOrExit(
    "CAMPAY_RETRY_BASE_DELAY",
    process.env.CAMPAY_RETRY_BASE_DELAY,
    1000,
  );
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function resolvePublicBaseUrl(port: string | number): string {
  if (process.env.API_PUBLIC_URL) {
    return normalizeBaseUrl(process.env.API_PUBLIC_URL);
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    const value = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
    return value.replace(/\/api\/v\d+$/i, "");
  }

  return `http://localhost:${port}`;
}

function resolveListenBaseUrl(host: string, port: string | number): string {
  const normalizedHost =
    host === "0.0.0.0" || host === "::" || host === "::0" ? "localhost" : host;
  return `http://${normalizedHost}:${port}`;
}

function isTrustedDevelopmentOrigin(origin: string): boolean {
  const trimmedOrigin = origin.trim();

  if (/^exp:\/\//i.test(trimmedOrigin)) {
    return true;
  }

  return /^(https?:\/\/)(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(
    trimmedOrigin,
  );
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
  validateCampayConfigOrExit();

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
  const nodeEnv = resolveRuntimeEnvironment();

  const allowedOrigins = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.CORS_ORIGIN,
    process.env.APP_URL,
    "https://coopenergie-backend.vercel.app",
    "http://localhost:3000",
    "http://localhost:4000",
    "http://localhost:8094",
    "http://localhost:8081",
    "http://localhost:8082",
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        const allowDevOrigin =
          nodeEnv !== "production" &&
          typeof origin === "string" &&
          isTrustedDevelopmentOrigin(origin);

        if (!origin || allowedOrigins.includes(origin) || allowDevOrigin) {
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
  const listenHost = process.env.API_HOST?.trim() || "0.0.0.0";
  const listenBaseUrl = resolveListenBaseUrl(listenHost, port);
  const publicBaseUrl = resolvePublicBaseUrl(port);
  const graphqlUrl = `${publicBaseUrl}/graphql`;
  const usesCustomPublicUrl = publicBaseUrl !== listenBaseUrl;

  await app.listen(port, listenHost, () => {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║       🚀 CoopEnergie Backend Server Started 🚀         ║");
    console.log("╚════════════════════════════════════════════════════════╝");
    console.log(`\n  ✓ Environment:     ${nodeEnv}`);
    console.log(`  ✓ Server listening on: ${listenBaseUrl}`);
    if (usesCustomPublicUrl) {
      console.log(`  ✓ Public API base:   ${publicBaseUrl}`);
    }
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
