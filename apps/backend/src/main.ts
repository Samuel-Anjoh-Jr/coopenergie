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

async function bootstrap() {
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
  app.use(
    cors({
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
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

  const port = process.env.API_PORT || 4000;
  const nodeEnv = process.env.NODE_ENV || "development";

  await app.listen(port, () => {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║       🚀 CoopEnergie Backend Server Started 🚀         ║");
    console.log("╚════════════════════════════════════════════════════════╝");
    console.log(`\n  ✓ Environment:     ${nodeEnv}`);
    console.log(`  ✓ Server running on: http://localhost:${port}`);
    console.log(`  ✓ GraphQL endpoint:  http://localhost:${port}/graphql`);
    console.log(`  ✓ API prefix:        /api/v1`);
    console.log(
      `  ✓ Database:        ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`,
    );
    console.log(
      `  ✓ Redis:           ${process.env.REDIS_URL ? "Connected" : "Not configured"}`,
    );
    console.log(
      `  ✓ JWT enabled:     ${process.env.NEXTAUTH_SECRET ? "Yes" : "No"}`,
    );
    console.log("\n  Ready to handle requests...\n");
  });
}

bootstrap();
