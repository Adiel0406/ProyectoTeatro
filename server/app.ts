import { randomBytes } from "node:crypto";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";
import {
  idSchema,
  reservationSchema,
  workshopApplicationSchema,
} from "./schemas.ts";

class SeatsUnavailableError extends Error {}
class WorkshopUnavailableError extends Error {}

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function createApp(prisma: PrismaClient, webOrigin: string) {
  const app = express();
  const api = express.Router();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: webOrigin }));
  app.use(express.json({ limit: "32kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  api.get("/health", async (_request, response) => {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok" });
  });

  api.get("/shows", async (_request, response) => {
    const shows = await prisma.show.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      include: {
        performances: {
          where: { startsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          include: { seats: { select: { status: true } } },
        },
      },
    });

    response.json(
      shows.map(({ performances, ...show }) => ({
        ...show,
        genre: show.genre.toLowerCase(),
        performances: performances.map(({ seats, ...performance }) => ({
          ...performance,
          availableSeats: seats.filter((seat) => seat.status === "AVAILABLE").length,
        })),
      })),
    );
  });

  api.get("/workshops", async (_request, response) => {
    const workshops = await prisma.workshop.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        schedule: true,
        teacher: true,
        capacity: true,
        enrolledSeats: true,
      },
    });
    response.json(workshops);
  });

  api.get("/performances/:id/seats", async (request, response) => {
    const performanceId = idSchema.parse(request.params.id);
    const performance = await prisma.performance.findUnique({
      where: { id: performanceId },
      select: {
        id: true,
        venue: true,
        startsAt: true,
        show: { select: { title: true } },
        seats: {
          orderBy: [{ code: "asc" }],
          select: { id: true, code: true, category: true, price: true, status: true },
        },
      },
    });

    if (!performance || performance.startsAt < new Date()) {
      response.status(404).json({
        error: { code: "PERFORMANCE_NOT_FOUND", message: "La función ya no está disponible." },
      });
      return;
    }

    response.json(performance);
  });

  api.post(
    "/reservations",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 8,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    async (request, response) => {
      const input = reservationSchema.parse(request.body);

      try {
        const reservation = await prisma.$transaction(async (transaction) => {
          const performance = await transaction.performance.findUnique({
            where: { id: input.performanceId },
            select: { id: true, startsAt: true },
          });
          if (!performance || performance.startsAt < new Date()) {
            throw new SeatsUnavailableError();
          }

          const seats = await transaction.seat.findMany({
            where: {
              performanceId: performance.id,
              code: { in: input.seatCodes },
            },
            select: { id: true, code: true, price: true, status: true },
          });
          if (
            seats.length !== input.seatCodes.length ||
            seats.some((seat) => seat.status !== "AVAILABLE")
          ) {
            throw new SeatsUnavailableError();
          }

          const updated = await transaction.seat.updateMany({
            where: {
              id: { in: seats.map((seat) => seat.id) },
              status: "AVAILABLE",
            },
            data: { status: "RESERVED" },
          });
          if (updated.count !== seats.length) {
            throw new SeatsUnavailableError();
          }

          const created = await transaction.reservation.create({
            data: {
              confirmationCode: randomBytes(8).toString("hex").toUpperCase(),
              performanceId: performance.id,
              customerName: input.name,
              customerEmail: input.email,
              totalAmount: seats.reduce((total, seat) => total + seat.price, 0),
              seats: {
                create: seats.map((seat) => ({ seatId: seat.id })),
              },
            },
            select: {
              confirmationCode: true,
              totalAmount: true,
              seats: { select: { seat: { select: { code: true } } } },
            },
          });
          return created;
        });

        response.status(201).json({
          confirmationCode: reservation.confirmationCode,
          totalAmount: reservation.totalAmount,
          seatCodes: reservation.seats.map(({ seat }) => seat.code),
        });
      } catch (error) {
        if (error instanceof SeatsUnavailableError || isPrismaCode(error, "P2002")) {
          response.status(409).json({
            error: {
              code: "SEATS_UNAVAILABLE",
              message: "Una o más butacas ya no están disponibles. Actualiza el mapa e inténtalo otra vez.",
            },
          });
          return;
        }
        throw error;
      }
    },
  );

  api.post(
    "/workshop-applications",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 8,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    async (request, response) => {
      const input = workshopApplicationSchema.parse(request.body);

      try {
        const application = await prisma.$transaction(async (transaction) => {
          const workshop = await transaction.workshop.findUnique({
            where: { id: input.workshopId },
            select: { id: true, title: true, active: true, capacity: true },
          });
          if (!workshop?.active) {
            throw new WorkshopUnavailableError();
          }

          const updated = await transaction.workshop.updateMany({
            where: {
              id: workshop.id,
              active: true,
              enrolledSeats: { lt: workshop.capacity },
            },
            data: { enrolledSeats: { increment: 1 } },
          });
          if (updated.count !== 1) {
            throw new WorkshopUnavailableError();
          }

          return transaction.workshopApplication.create({
            data: {
              workshopId: workshop.id,
              name: input.name,
              email: input.email,
            },
            select: { id: true },
          });
        });

        response.status(201).json({
          applicationId: application.id,
          message: "Tu solicitud de inscripción fue recibida.",
        });
      } catch (error) {
        if (error instanceof WorkshopUnavailableError) {
          response.status(409).json({
            error: { code: "WORKSHOP_FULL", message: "Este taller ya no tiene cupos disponibles." },
          });
          return;
        }
        if (isPrismaCode(error, "P2002")) {
          response.status(409).json({
            error: {
              code: "APPLICATION_EXISTS",
              message: "Ya existe una inscripción para este correo en el taller.",
            },
          });
          return;
        }
        throw error;
      }
    },
  );

  api.use((_request, response) => {
    response.status(404).json({
      error: { code: "NOT_FOUND", message: "La ruta solicitada no existe." },
    });
  });

  app.use("/api", api);

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Revisa los datos enviados.",
          details: error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
        },
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.parse.failed"
    ) {
      response.status(400).json({
        error: { code: "INVALID_JSON", message: "El cuerpo de la solicitud no es JSON válido." },
      });
      return;
    }

    console.error("Error en la API:", error);
    response.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." },
    });
  };
  app.use(errorHandler);

  return app;
}
