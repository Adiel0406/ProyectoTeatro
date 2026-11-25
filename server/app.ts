import { randomBytes } from "node:crypto";
import cors from "cors";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";
import {
  accessCodeSchema,
  adminRoleChangeSchema,
  adminReportPeriodSchema,
  createPerformanceSchema,
  createShowSchema,
  credentialsSchema,
  decodeJpegPosterDataUrl,
  idSchema,
  profileSchema,
  registrationSchema,
  reservationSchema,
  showStatusSchema,
  workshopApplicationSchema,
} from "./schemas.ts";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./security.ts";

class SeatsUnavailableError extends Error {}
class PerformanceUnavailableError extends Error {}
class WorkshopUnavailableError extends Error {}
class AccessCodeInvalidError extends Error {}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SEAT_ROWS = ["A", "B", "C", "D", "E", "F"] as const;
const SEATS_PER_ROW = 8;

function readSessionToken(cookieHeader: string | undefined): string | undefined {
  return cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("teatro_session="))
    ?.slice("teatro_session=".length);
}

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
  if (process.env.RENDER === "true") app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use((request, response, next) => {
    const origin = request.get("origin");
    if (
      origin &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      origin !== webOrigin
    ) {
      response.status(403).json({
        error: { code: "INVALID_ORIGIN", message: "El origen de la solicitud no está permitido." },
      });
      return;
    }
    next();
  });
  const defaultJsonParser = express.json({ limit: "32kb" });
  const showPosterJsonParser = express.json({ limit: "4500kb" });
  app.use((request, response, next) => {
    if (request.method === "POST" && request.path === "/api/admin/shows") {
      showPosterJsonParser(request, response, next);
      return;
    }
    defaultJsonParser(request, response, next);
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const requireAuth: RequestHandler = async (request, response, next) => {
    try {
      const token = readSessionToken(request.headers.cookie);
      if (!token || !/^[\da-zA-Z_-]{40,60}$/.test(token)) {
        response.status(401).json({
          error: { code: "UNAUTHENTICATED", message: "Inicia sesión para continuar." },
        });
        return;
      }

      const session = await prisma.authSession.findUnique({
        where: { tokenHash: hashToken(token) },
        select: {
          user: { select: { id: true, ci: true, role: true } },
          expiresAt: true,
        },
      });
      if (!session || session.expiresAt <= new Date()) {
        response.status(401).json({
          error: { code: "UNAUTHENTICATED", message: "Tu sesión venció. Inicia sesión otra vez." },
        });
        return;
      }

      response.locals.authUser = session.user;
      next();
    } catch (error) {
      next(error);
    }
  };

  const optionalAuth: RequestHandler = async (request, response, next) => {
    try {
      const token = readSessionToken(request.headers.cookie);
      if (!token || !/^[\da-zA-Z_-]{40,60}$/.test(token)) {
        next();
        return;
      }

      const session = await prisma.authSession.findUnique({
        where: { tokenHash: hashToken(token) },
        select: {
          user: { select: { id: true, ci: true, role: true } },
          expiresAt: true,
        },
      });
      if (session && session.expiresAt > new Date()) {
        response.locals.authUser = session.user;
      }
      next();
    } catch (error) {
      next(error);
    }
  };

  const requireAdmin: RequestHandler = (_request, response, next) => {
    if (
      response.locals.authUser?.role !== "ADMIN" &&
      response.locals.authUser?.role !== "SUPERADMIN"
    ) {
      response.status(403).json({
        error: { code: "FORBIDDEN", message: "Esta acción requiere permisos de administrador." },
      });
      return;
    }
    next();
  };

  const requireSuperadmin: RequestHandler = (_request, response, next) => {
    if (response.locals.authUser?.role !== "SUPERADMIN") {
      response.status(403).json({
        error: { code: "FORBIDDEN", message: "Esta acción requiere permisos de superadministrador." },
      });
      return;
    }
    next();
  };

  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const sessionCookieOptions = [
    "HttpOnly",
    "SameSite=Strict",
    "Path=/api",
    `Max-Age=${SESSION_DURATION_MS / 1000}`,
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
  const clearedCookieOptions = [
    "HttpOnly",
    "SameSite=Strict",
    "Path=/api",
    "Max-Age=0",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");

  api.post("/auth/register", authRateLimit, async (request, response) => {
    const input = registrationSchema.parse(request.body);
    const passwordHash = await hashPassword(input.password);
    const userData = {
      ci: input.ci,
      passwordHash,
      role: input.accessCode ? "ADMIN" as const : "USER" as const,
    };

    try {
      const user = await prisma.$transaction(async (transaction) => {
        if (!input.accessCode) {
          return transaction.user.create({
            data: { ...userData, role: "USER" },
            select: { id: true, ci: true, role: true },
          });
        }

        const codeHash = hashToken(input.accessCode);
        const accessCode = await transaction.accessCode.findUnique({
          where: { codeHash },
          select: { id: true, expiresAt: true, usedAt: true, revokedAt: true },
        });
        if (
          !accessCode ||
          accessCode.usedAt ||
          accessCode.revokedAt ||
          accessCode.expiresAt <= new Date()
        ) {
          throw new AccessCodeInvalidError();
        }

        const user = await transaction.user.create({
          data: userData,
          select: { id: true, ci: true, role: true },
        });
        const consumed = await transaction.accessCode.updateMany({
          where: {
            id: accessCode.id,
            usedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date(), usedById: user.id },
        });
        if (consumed.count !== 1) {
          throw new AccessCodeInvalidError();
        }
        return user;
      });

      const token = createOpaqueToken();
      await prisma.$transaction(async (transaction) => {
        await transaction.authSession.create({
          data: {
            tokenHash: hashToken(token),
            userId: user.id,
            expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
          },
        });
        await transaction.userAccessEvent.create({
          data: { userId: user.id, type: "REGISTER" },
        });
      });
      response.setHeader("Set-Cookie", `teatro_session=${token}; ${sessionCookieOptions}`);
      response.status(201).json({ user });
    } catch (error) {
      if (error instanceof AccessCodeInvalidError) {
        response.status(400).json({
          error: { code: "INVALID_ACCESS_CODE", message: "El código de acceso no existe, venció o ya fue usado." },
        });
        return;
      }
      if (isPrismaCode(error, "P2002")) {
        response.status(409).json({
          error: { code: "CI_ALREADY_REGISTERED", message: "Ya existe una cuenta con ese CI." },
        });
        return;
      }
      throw error;
    }
  });

  api.post("/auth/login", authRateLimit, async (request, response) => {
    const input = credentialsSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: { ci: input.ci },
      select: { id: true, ci: true, role: true, passwordHash: true },
    });
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      response.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "El CI o la contraseña no son correctos." },
      });
      return;
    }

    const token = createOpaqueToken();
    await prisma.$transaction(async (transaction) => {
      await transaction.authSession.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        },
      });
      await transaction.userAccessEvent.create({
        data: { userId: user.id, type: "LOGIN" },
      });
    });
    response.setHeader("Set-Cookie", `teatro_session=${token}; ${sessionCookieOptions}`);
    response.json({ user: { id: user.id, ci: user.ci, role: user.role } });
  });

  api.get("/auth/me", requireAuth, (_request, response) => {
    response.json({ user: response.locals.authUser });
  });

  api.get("/account/profile", requireAuth, async (_request, response) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: response.locals.authUser.id },
      select: {
        id: true,
        ci: true,
        role: true,
        displayName: true,
        bio: true,
        favoriteQuote: true,
        createdAt: true,
      },
    });
    response.json({ user });
  });

  api.patch("/account/profile", requireAuth, async (request, response) => {
    const input = profileSchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: response.locals.authUser.id },
      data: input,
      select: {
        id: true,
        ci: true,
        role: true,
        displayName: true,
        bio: true,
        favoriteQuote: true,
        createdAt: true,
      },
    });
    response.json({ user });
  });

  api.get("/account/history", requireAuth, async (_request, response) => {
    const userId = response.locals.authUser.id;
    const [reservations, accessEvents] = await Promise.all([
      prisma.reservation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          performance: { include: { show: { select: { title: true } } } },
          seats: { include: { seat: { select: { code: true } } } },
        },
      }),
      prisma.userAccessEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, createdAt: true },
      }),
    ]);
    response.json({
      reservations: reservations.map(({ seats, performance, ...reservation }) => ({
        ...reservation,
        performance: { ...performance, show: performance.show },
        seatCodes: seats.map(({ seat }) => seat.code).sort(),
      })),
      accessEvents,
    });
  });

  api.post("/auth/logout", async (request, response) => {
    const token = readSessionToken(request.headers.cookie);
    if (token) {
      await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
    response.setHeader("Set-Cookie", `teatro_session=; ${clearedCookieOptions}`);
    response.json({ message: "Sesión cerrada." });
  });

  api.get("/admin/reservations", requireAuth, requireAdmin, async (_request, response) => {
    const reservations = await prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        performance: { include: { show: { select: { title: true } } } },
        seats: { include: { seat: { select: { code: true } } } },
      },
    });
    response.json(
      reservations.map(({ seats, performance, ...reservation }) => ({
        ...reservation,
        performance: {
          id: performance.id,
          venue: performance.venue,
          startsAt: performance.startsAt,
          endsAt: performance.endsAt,
          show: performance.show,
        },
        seatCodes: seats.map(({ seat }) => seat.code).sort(),
      })),
    );
  });

  api.get("/admin/reports", requireAuth, requireAdmin, async (request, response) => {
    const period = adminReportPeriodSchema.parse(request.query.period ?? "month");
    const now = new Date();
    const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (period === "week") {
      startsAt.setUTCDate(startsAt.getUTCDate() - ((startsAt.getUTCDay() + 6) % 7));
    } else if (period === "month") {
      startsAt.setUTCDate(1);
    } else {
      startsAt.setUTCMonth(0, 1);
    }

    const [reservations, loginCount] = await Promise.all([
      prisma.reservation.findMany({
        where: { createdAt: { gte: startsAt, lte: now } },
        select: {
          totalAmount: true,
          performance: { select: { show: { select: { id: true, title: true } } } },
        },
      }),
      prisma.userAccessEvent.count({
        where: { type: "LOGIN", createdAt: { gte: startsAt, lte: now } },
      }),
    ]);
    const revenueByShow = new Map<string, { id: string; title: string; reservationCount: number; amount: number }>();
    for (const reservation of reservations) {
      const { id, title } = reservation.performance.show;
      const current = revenueByShow.get(id) ?? { id, title, reservationCount: 0, amount: 0 };
      current.reservationCount += 1;
      current.amount += reservation.totalAmount;
      revenueByShow.set(id, current);
    }
    response.json({
      period,
      startsAt,
      endsAt: now,
      reservationCount: reservations.length,
      reservedAmount: reservations.reduce((total, item) => total + item.totalAmount, 0),
      loginCount,
      byShow: [...revenueByShow.values()]
        .sort((left, right) => right.amount - left.amount),
    });
  });

  api.get("/admin/users", requireAuth, requireSuperadmin, async (_request, response) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ci: true,
        role: true,
        displayName: true,
        bio: true,
        favoriteQuote: true,
        createdAt: true,
        _count: { select: { reservations: true, accessEvents: true } },
        accessEvents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    response.json(users.map(({ _count, accessEvents, ...user }) => ({
      ...user,
      reservationCount: _count.reservations,
      accessCount: _count.accessEvents,
      lastAccessAt: accessEvents[0]?.createdAt ?? null,
    })));
  });

  api.get("/admin/users/:id/history", requireAuth, requireSuperadmin, async (request, response) => {
    const userId = idSchema.parse(request.params.id);
    const [user, reservations, accessEvents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          ci: true,
          role: true,
          displayName: true,
          bio: true,
          favoriteQuote: true,
          createdAt: true,
        },
      }),
      prisma.reservation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          performance: { include: { show: { select: { title: true } } } },
          seats: { include: { seat: { select: { code: true } } } },
        },
      }),
      prisma.userAccessEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, type: true, createdAt: true },
      }),
    ]);
    if (!user) {
      response.status(404).json({
        error: { code: "USER_NOT_FOUND", message: "No se encontró la cuenta solicitada." },
      });
      return;
    }
    response.json({
      user,
      reservations: reservations.map(({ seats, performance, ...reservation }) => ({
        ...reservation,
        performance: { ...performance, show: performance.show },
        seatCodes: seats.map(({ seat }) => seat.code).sort(),
      })),
      accessEvents,
    });
  });

  api.get("/admin/access-events", requireAuth, requireSuperadmin, async (_request, response) => {
    const events = await prisma.userAccessEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        createdAt: true,
        user: { select: { id: true, ci: true, displayName: true } },
      },
    });
    response.json(events);
  });

  api.patch("/admin/users/:id/role", requireAuth, requireSuperadmin, async (request, response) => {
    const userId = idSchema.parse(request.params.id);
    const input = adminRoleChangeSchema.parse(request.body);
    if (userId === response.locals.authUser.id) {
      response.status(409).json({
        error: { code: "ROLE_CHANGE_NOT_ALLOWED", message: "No puedes cambiar tu propio rol de superadministrador." },
      });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!target) {
      response.status(404).json({
        error: { code: "USER_NOT_FOUND", message: "No se encontró la cuenta solicitada." },
      });
      return;
    }
    if (target.role === "SUPERADMIN") {
      response.status(409).json({
        error: { code: "ROLE_CHANGE_NOT_ALLOWED", message: "No se puede cambiar el rol de una cuenta de superadministrador." },
      });
      return;
    }

    if (target.role !== input.role) {
      const updated = await prisma.$transaction(async (transaction) => {
        const result = await transaction.user.updateMany({
          where: { id: userId, role: target.role },
          data: { role: input.role },
        });
        if (result.count !== 1) return false;
        await transaction.authSession.deleteMany({ where: { userId } });
        return true;
      });
      if (!updated) {
        response.status(409).json({
          error: { code: "ROLE_CHANGE_CONFLICT", message: "La cuenta cambió mientras se actualizaba. Recarga e inténtalo otra vez." },
        });
        return;
      }
    }
    response.json({ id: userId, role: input.role });
  });

  function toPosterUrl(showId: string, poster: { updatedAt: Date } | null): string | null {
    return poster ? `/api/shows/${showId}/poster?v=${poster.updatedAt.getTime()}` : null;
  }

  api.get("/admin/shows", requireAuth, requireAdmin, async (_request, response) => {
    const shows = await prisma.show.findMany({
      orderBy: [{ active: "desc" }, { title: "asc" }],
      include: {
        poster: { select: { updatedAt: true } },
        performances: {
          orderBy: { startsAt: "asc" },
          include: { seats: { select: { status: true } } },
        },
      },
    });
    response.json(
      shows.map(({ performances, poster, ...show }) => ({
        ...show,
        genre: show.genre.toLowerCase(),
        posterUrl: toPosterUrl(show.id, poster),
        performances: performances.map(({ seats, ...performance }) => ({
          ...performance,
          availableSeats: seats.filter((seat) => seat.status === "AVAILABLE").length,
        })),
      })),
    );
  });

  api.patch("/admin/shows/:id", requireAuth, requireAdmin, async (request, response) => {
    const showId = idSchema.parse(request.params.id);
    const input = showStatusSchema.parse(request.body);
    const updated = await prisma.show.updateMany({
      where: { id: showId },
      data: { active: input.active },
    });
    if (updated.count !== 1) {
      response.status(404).json({
        error: { code: "SHOW_NOT_FOUND", message: "No se encontró la obra solicitada." },
      });
      return;
    }
    response.json({ active: input.active });
  });

  api.get("/admin/access-codes", requireAuth, requireSuperadmin, async (_request, response) => {
    const accessCodes = await prisma.accessCode.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        createdBy: { select: { ci: true } },
        usedBy: { select: { ci: true } },
      },
    });
    response.json(accessCodes);
  });

  api.delete("/admin/access-codes/:id", requireAuth, requireSuperadmin, async (request, response) => {
    const accessCodeId = idSchema.parse(request.params.id);
    const revoked = await prisma.accessCode.updateMany({
      where: {
        id: accessCodeId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) {
      response.status(409).json({
        error: {
          code: "ACCESS_CODE_NOT_REVOCABLE",
          message: "El código ya se usó, venció o fue revocado.",
        },
      });
      return;
    }
    response.json({ revoked: true });
  });

  api.post("/admin/access-codes", requireAuth, requireSuperadmin, async (request, response) => {
    const input = accessCodeSchema.parse(request.body);
    const code = randomBytes(16).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    await prisma.accessCode.create({
      data: {
        codeHash: hashToken(code),
        createdById: response.locals.authUser.id,
        expiresAt,
      },
    });
    response.status(201).json({ code, expiresAt });
  });

  async function createPerformance(
    transaction: Prisma.TransactionClient,
    showId: string,
    input: {
      startsAt: string;
      venue: string;
      standardPrice: number;
      preferredPrice: number;
    },
    duration: number,
  ) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    const performance = await transaction.performance.create({
      data: { showId, startsAt, endsAt, venue: input.venue },
      select: { id: true, startsAt: true, endsAt: true, venue: true },
    });
    const seats = SEAT_ROWS.flatMap((row) =>
      Array.from({ length: SEATS_PER_ROW }, (_, index) => {
        const preferred = row === "A" && (index === 0 || index === SEATS_PER_ROW - 1);
        return {
          performanceId: performance.id,
          code: `${row}${index + 1}`,
          category: preferred ? "Preferencial" : "Estándar",
          price: preferred ? input.preferredPrice : input.standardPrice,
        };
      }),
    );
    await transaction.seat.createMany({ data: seats });
    return performance;
  }

  api.post("/admin/shows", requireAuth, requireAdmin, async (request, response) => {
    const input = createShowSchema.parse(request.body);
    const posterBuffer = input.posterImage ? decodeJpegPosterDataUrl(input.posterImage) : null;
    if (input.posterImage && !posterBuffer) {
      response.status(400).json({
        error: {
          code: "INVALID_POSTER",
          message: "La portada debe ser una imagen en formato JPG válida de hasta 3 MB.",
        },
      });
      return;
    }

    const slugBase = input.title
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("en")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const posterStyle = {
      DRAMA: "bernarda",
      COMEDIA: "summer",
      MUSICAL: "voices",
    }[input.genre];

    const result = await prisma.$transaction(async (transaction) => {
      const show = await transaction.show.create({
        data: {
          slug: `${slugBase}-${randomBytes(3).toString("hex")}`,
          title: input.title,
          synopsis: input.synopsis,
          playwright: input.playwright,
          genre: input.genre,
          duration: input.duration,
          posterStyle,
          ...(posterBuffer
            ? { poster: { create: { imageData: Uint8Array.from(posterBuffer) } } }
            : {}),
        },
        select: { id: true, title: true },
      });
      const performance = await createPerformance(transaction, show.id, input, input.duration);
      return { show, performance };
    });

    response.status(201).json(result);
  });

  api.post("/admin/shows/:id/performances", requireAuth, requireAdmin, async (request, response) => {
    const showId = idSchema.parse(request.params.id);
    const input = createPerformanceSchema.parse(request.body);
    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { id: true, active: true, duration: true },
    });
    if (!show?.active) {
      response.status(404).json({
        error: { code: "SHOW_NOT_FOUND", message: "La obra no existe o no está activa." },
      });
      return;
    }

    try {
      const performance = await prisma.$transaction((transaction) =>
        createPerformance(transaction, show.id, input, show.duration),
      );
      response.status(201).json({ performance });
    } catch (error) {
      if (isPrismaCode(error, "P2002")) {
        response.status(409).json({
          error: { code: "PERFORMANCE_EXISTS", message: "Ya existe una función de esta obra en esa fecha." },
        });
        return;
      }
      throw error;
    }
  });

  api.get("/health", async (_request, response) => {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok" });
  });

  api.get("/shows", async (_request, response) => {
    const shows = await prisma.show.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      include: {
        poster: { select: { updatedAt: true } },
        performances: {
          where: { startsAt: { gte: new Date() }, endsAt: { gt: new Date() } },
          orderBy: { startsAt: "asc" },
          include: { seats: { select: { status: true } } },
        },
      },
    });

    response.json(
      shows.map(({ performances, poster, ...show }) => ({
        ...show,
        genre: show.genre.toLowerCase(),
        posterUrl: toPosterUrl(show.id, poster),
        performances: performances.map(({ seats, ...performance }) => ({
          ...performance,
          availableSeats: seats.filter((seat) => seat.status === "AVAILABLE").length,
        })),
      })),
    );
  });

  api.get("/shows/:id/poster", async (request, response) => {
    const showId = idSchema.parse(request.params.id);
    const poster = await prisma.showPoster.findUnique({
      where: { showId },
      select: { imageData: true },
    });
    if (!poster) {
      response.status(404).json({
        error: { code: "POSTER_NOT_FOUND", message: "La obra no tiene portada personalizada." },
      });
      return;
    }

    const body = Buffer.from(poster.imageData);
    response.setHeader("Content-Type", "image/jpeg");
    response.setHeader("Content-Length", String(body.length));
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.send(body);
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
        endsAt: true,
        show: { select: { title: true } },
        seats: {
          orderBy: [{ code: "asc" }],
          select: { id: true, code: true, category: true, price: true, status: true },
        },
      },
    });

    if (
      !performance ||
      performance.startsAt <= new Date() ||
      performance.endsAt <= new Date()
    ) {
      response.status(404).json({
        error: { code: "PERFORMANCE_NOT_FOUND", message: "La función ya no está disponible." },
      });
      return;
    }

    response.json(performance);
  });

  api.post(
    "/reservations",
    optionalAuth,
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
            select: { id: true, startsAt: true, endsAt: true },
          });
          if (
            !performance ||
            performance.startsAt <= new Date() ||
            performance.endsAt <= new Date()
          ) {
            throw new PerformanceUnavailableError();
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
              userId: response.locals.authUser?.id,
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
        if (error instanceof PerformanceUnavailableError) {
          response.status(409).json({
            error: {
              code: "PERFORMANCE_EXPIRED",
              message: "La función ya comenzó o venció y no admite nuevas reservas.",
            },
          });
          return;
        }
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
      error.type === "entity.too.large"
    ) {
      response.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "La imagen de portada es demasiado grande. Usa un archivo JPG de hasta 3 MB.",
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
