import { z } from "zod";

export const reservationSchema = z.object({
  performanceId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  seatCodes: z
    .array(z.string().regex(/^[A-F][1-8]$/))
    .min(1)
    .max(4)
    .superRefine((codes, context) => {
      if (new Set(codes).size !== codes.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No repitas una misma butaca.",
        });
      }
    }),
});

export const workshopApplicationSchema = z.object({
  workshopId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
});

export const idSchema = z.string().uuid();

export const credentialsSchema = z.object({
  ci: z.string().trim().regex(/^\d{5,15}$/, "El CI debe contener entre 5 y 15 dígitos."),
  password: z.string().min(8).max(128),
});

export const registrationSchema = credentialsSchema.extend({
  accessCode: z.string().trim().min(8).max(64).optional(),
});

export const accessCodeSchema = z.object({
  expiresInDays: z.number().int().min(1).max(90),
});

export const showStatusSchema = z.object({
  active: z.boolean(),
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(80).nullable(),
  bio: z.string().trim().max(500).nullable(),
  favoriteQuote: z.string().trim().max(160).nullable(),
});

export const adminReportPeriodSchema = z.enum(["week", "month", "year"]);

const futureDateSchema = z.iso.datetime().refine(
  (value) => new Date(value).getTime() > Date.now(),
  "La función debe tener una fecha futura.",
);

const performanceFields = {
  startsAt: futureDateSchema,
  venue: z.string().trim().min(2).max(120),
  standardPrice: z.number().int().min(1).max(100_000),
  preferredPrice: z.number().int().min(1).max(100_000),
};

export const createShowSchema = z.object({
  title: z.string().trim().min(2).max(120),
  synopsis: z.string().trim().min(10).max(2000),
  playwright: z.string().trim().min(2).max(120),
  genre: z.enum(["DRAMA", "COMEDIA", "MUSICAL"]),
  duration: z.number().int().min(1).max(600),
  ...performanceFields,
});

export const createPerformanceSchema = z.object(performanceFields);

export type ReservationInput = z.infer<typeof reservationSchema>;
export type WorkshopApplicationInput = z.infer<typeof workshopApplicationSchema>;
