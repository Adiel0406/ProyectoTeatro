import { describe, expect, it } from "vitest";
import {
  accessCodeSchema,
  createShowSchema,
  credentialsSchema,
  registrationSchema,
  reservationSchema,
} from "./schemas.ts";

const validReservation = {
  performanceId: "2f3c4b5a-6d7e-4890-a123-456789abcdef",
  name: "Ana Pérez",
  email: "ana@example.com",
  seatCodes: ["A1", "A2"],
};

describe("reservationSchema", () => {
  it("accepts up to four distinct, valid seat codes", () => {
    expect(
      reservationSchema.safeParse({
        ...validReservation,
        seatCodes: ["A1", "B4", "C7", "F8"],
      }).success,
    ).toBe(true);
  });

  it("rejects repeated, invalid, or more than four seats", () => {
    for (const seatCodes of [
      ["A1", "A1"],
      ["G9"],
      ["A1", "A2", "A3", "A4", "A5"],
    ]) {
      expect(
        reservationSchema.safeParse({ ...validReservation, seatCodes }).success,
      ).toBe(false);
    }
  });
});

describe("account and administrator schemas", () => {
  it("accepts digit-only CI credentials and an optional invitation code", () => {
    expect(credentialsSchema.safeParse({ ci: "13609270", password: "A-secure-pass-2026" }).success).toBe(true);
    expect(registrationSchema.safeParse({
      ci: "13609270",
      password: "A-secure-pass-2026",
      accessCode: "A".repeat(32),
    }).success).toBe(true);
    expect(credentialsSchema.safeParse({ ci: "1360x270", password: "A-secure-pass-2026" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ ci: "13609270", password: "short" }).success).toBe(false);
  });

  it("requires bounded expiration for administrator access codes", () => {
    expect(accessCodeSchema.safeParse({ expiresInDays: 14 }).success).toBe(true);
    expect(accessCodeSchema.safeParse({ expiresInDays: 0 }).success).toBe(false);
    expect(accessCodeSchema.safeParse({ expiresInDays: 91 }).success).toBe(false);
  });

  it("rejects show schedules that do not have a future performance", () => {
    const show = {
      title: "Una obra de prueba",
      synopsis: "Una descripción suficientemente larga para la obra.",
      playwright: "Dramaturgia de prueba",
      genre: "DRAMA",
      duration: 90,
      venue: "Sala principal",
      startsAt: "2099-06-01T22:00:00.000Z",
      standardPrice: 40,
      preferredPrice: 70,
    };
    expect(createShowSchema.safeParse(show).success).toBe(true);
    expect(createShowSchema.safeParse({ ...show, startsAt: "2000-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(createShowSchema.safeParse({ ...show, startsAt: "not-a-date" }).success).toBe(false);
  });
});
