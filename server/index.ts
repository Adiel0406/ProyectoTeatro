import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT debe ser un número de puerto válido.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatorio para iniciar la API.");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  }),
});
const webOrigin =
  process.env.WEB_ORIGIN ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:5173";
const app = createApp(prisma, webOrigin);

if (process.env.NODE_ENV === "production") {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const webDirectory = path.resolve(currentDirectory, "../../dist");
  app.use(express.static(webDirectory));
  app.get(/.*/, (_request, response) => response.sendFile(path.join(webDirectory, "index.html")));
}

const server = app.listen(port, () => {
  console.log(`Teatro UCB API escuchando en http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
