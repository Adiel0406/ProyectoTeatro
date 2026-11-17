import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { credentialsSchema } from "../server/schemas.ts";
import { hashPassword } from "../server/security.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatorio para aprovisionar al administrador.");
}

const credentials = credentialsSchema.parse({
  ci: process.env.ADMIN_CI,
  password: process.env.ADMIN_PASSWORD,
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 }),
});

try {
  const existing = await prisma.user.findUnique({
    where: { ci: credentials.ci },
    select: { role: true },
  });
  if (existing) {
    if (existing.role !== "ADMIN") {
      throw new Error("El CI configurado ya pertenece a una cuenta sin permisos de administrador.");
    }
    console.log("La cuenta de administrador ya está aprovisionada.");
  } else {
    await prisma.user.create({
      data: {
        ci: credentials.ci,
        passwordHash: await hashPassword(credentials.password),
        role: "ADMIN",
      },
    });
    console.log("Cuenta de administrador aprovisionada.");
  }
} finally {
  await prisma.$disconnect();
}
