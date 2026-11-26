import "dotenv/config";
import { PrismaClient, type Genre } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatorio para cargar los datos de ejemplo.");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 }),
});

const shows: Array<{
  slug: string;
  title: string;
  synopsis: string;
  playwright: string;
  genre: Genre;
  duration: number;
  posterStyle: string;
  dates: string[];
}> = [
  {
    slug: "el-santo-del-cuerno",
    title: "El santo del cuerno",
    synopsis:
      "Explora el universo interior, los miedos y la nobleza de quienes trabajan en las calles de La Paz.",
    playwright: "David Mondacca Arauz",
    genre: "DRAMA",
    duration: 90,
    posterStyle: "bernarda",
    dates: ["2026-12-11T23:30:00.000Z", "2026-12-18T23:30:00.000Z"],
  },
  {
    slug: "una-noche-de-verano",
    title: "Una noche de verano",
    synopsis:
      "Una cita equivocada y demasiadas coincidencias en una sola noche de comedia.",
    playwright: "Taller de Dramaturgia UCB",
    genre: "COMEDIA",
    duration: 75,
    posterStyle: "summer",
    dates: ["2026-12-13T00:00:00.000Z", "2026-12-20T00:00:00.000Z"],
  },
  {
    slug: "voces-del-altiplano",
    title: "Voces del Altiplano",
    synopsis:
      "Un viaje musical entre generaciones, recuerdos y paisajes andinos.",
    playwright: "Taller de Dramaturgia UCB",
    genre: "MUSICAL",
    duration: 80,
    posterStyle: "voices",
    dates: ["2026-12-14T22:00:00.000Z", "2026-12-21T22:00:00.000Z"],
  },
];

const workshops = [
  {
    slug: "actuacion-expresion-corporal",
    title: "Actuación y expresión corporal",
    description:
      "Explora herramientas vocales y corporales para la interpretación teatral desde cero.",
    schedule: "Sábados · 15 cupos",
    teacher: "Lic. Sofía Montenegro",
    capacity: 15,
  },
  {
    slug: "danza-contemporanea",
    title: "Danza contemporánea y movimiento",
    description:
      "Técnica orientada al dominio espacial, la fluidez corporal y el montaje escénico.",
    schedule: "Martes y jueves · 10 cupos",
    teacher: "Maestro Alejandro Ríos",
    capacity: 10,
  },
];

async function seed() {
  for (const showData of shows) {
    const { dates, ...data } = showData;
    const show = await prisma.show.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });

    for (const date of dates) {
      const startsAt = new Date(date);
      const endsAt = new Date(startsAt.getTime() + show.duration * 60_000);
      const performance = await prisma.performance.upsert({
        where: { showId_startsAt: { showId: show.id, startsAt } },
        update: { venue: "Sala principal", endsAt },
        create: { showId: show.id, venue: "Sala principal", startsAt, endsAt },
      });

      const seats = Array.from({ length: 32 }, (_, index) => {
        const row = String.fromCharCode(65 + Math.floor(index / 8));
        const number = (index % 8) + 1;
        const preferred = row === "A" && (number === 1 || number === 8);
        return {
          performanceId: performance.id,
          code: `${row}${number}`,
          category: preferred ? "Preferencial" : "Estándar",
          price: preferred ? 70 : 40,
        };
      });

      await prisma.seat.createMany({ data: seats, skipDuplicates: true });
    }
  }

  for (const workshop of workshops) {
    const { slug, ...data } = workshop;
    await prisma.workshop.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data },
    });
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("No se pudo cargar los datos de ejemplo:", error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
