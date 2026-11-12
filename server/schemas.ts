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

export type ReservationInput = z.infer<typeof reservationSchema>;
export type WorkshopApplicationInput = z.infer<typeof workshopApplicationSchema>;
