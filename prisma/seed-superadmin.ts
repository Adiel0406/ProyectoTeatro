import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { credentialsSchema } from "../server/schemas.ts";
import { hashPassword } from "../server/security.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatorio para aprovisionar al superadministrador.");
}

const credentials = credentialsSchema.parse({
  ci: process.env.SUPERADMIN_CI,
  password: process.env.SUPERADMIN_PASSWORD,
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 }),
});

try {
  const existing = await prisma.user.findUnique({
    where: { ci: credentials.ci },
    select: { id: true, role: true },
  });
  if (existing?.role === "SUPERADMIN") {
    console.log("La cuenta de superadministrador ya está aprovisionada.");
  } else {
    const passwordHash = await hashPassword(credentials.password);
    await prisma.user.upsert({
      where: { ci: credentials.ci },
      create: {
        ci: credentials.ci,
        passwordHash,
        role: "SUPERADMIN",
      },
      update: {
        passwordHash,
        role: "SUPERADMIN",
      },
    });
    console.log("Cuenta de superadministrador aprovisionada.");
  }
} finally {
  await prisma.$disconnect();
}
