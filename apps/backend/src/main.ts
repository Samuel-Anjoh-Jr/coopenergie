import "reflect-metadata";

import type { IncomingMessage } from "node:http";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
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
    (request: RawBodyRequest, _response: unknown, next: (error?: unknown) => void) => {
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
    exclude: [
      "/graphql",
      "graphql",
      "/payments/webhook",
      "payments/webhook",
    ],
  });
  app.use("/payments/webhook", express.raw({ type: "application/json" }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      credentials: true,
    }),
  );

  await app.listen(process.env.API_PORT || 4000);
}

bootstrap();
