import { describe, expect, it } from "vitest";
import {
  accessCodeSchema,
  adminRoleChangeSchema,
  adminReportPeriodSchema,
  createShowSchema,
  credentialsSchema,
  decodeJpegPosterDataUrl,
  MAX_POSTER_BYTES,
  profileSchema,
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

  it("accepts bounded profile fields and supported report periods", () => {
    expect(profileSchema.safeParse({
      displayName: "Ana",
      bio: "Me gusta el teatro.",
      favoriteQuote: "Que empiece la función",
    }).success).toBe(true);
    expect(profileSchema.safeParse({
      displayName: "A".repeat(81),
      bio: null,
      favoriteQuote: null,
    }).success).toBe(false);
    expect(adminReportPeriodSchema.safeParse("month").success).toBe(true);
    expect(adminReportPeriodSchema.safeParse("daily").success).toBe(false);
    expect(adminRoleChangeSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
    expect(adminRoleChangeSchema.safeParse({ role: "SUPERADMIN" }).success).toBe(false);
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

  it("accepts valid JPG poster data URLs and rejects non-JPG or oversized posters", () => {
    const validJpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const validPosterDataUrl = `data:image/jpeg;base64,${validJpegBytes.toString("base64")}`;

    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngDataUrl = `data:image/png;base64,${pngHeader.toString("base64")}`;
    const spoofedJpegDataUrl = `data:image/jpeg;base64,${pngHeader.toString("base64")}`;

    const oversizedJpeg = Buffer.alloc(MAX_POSTER_BYTES + 1, 0x00);
    oversizedJpeg[0] = 0xff;
    oversizedJpeg[1] = 0xd8;
    oversizedJpeg[2] = 0xff;
    const oversizedDataUrl = `data:image/jpeg;base64,${oversizedJpeg.toString("base64")}`;

    const baseShow = {
      title: "Una obra con portada",
      synopsis: "Una descripción suficientemente larga para la obra.",
      playwright: "Dramaturgia de prueba",
      genre: "DRAMA",
      duration: 90,
      venue: "Sala principal",
      startsAt: "2099-06-01T22:00:00.000Z",
      standardPrice: 40,
      preferredPrice: 70,
    };

    expect(decodeJpegPosterDataUrl(validPosterDataUrl)).toEqual(validJpegBytes);
    expect(decodeJpegPosterDataUrl(pngDataUrl)).toBeNull();
    expect(decodeJpegPosterDataUrl(spoofedJpegDataUrl)).toBeNull();
    expect(decodeJpegPosterDataUrl(oversizedDataUrl)).toBeNull();

    expect(createShowSchema.safeParse({ ...baseShow, posterImage: validPosterDataUrl }).success).toBe(true);
    expect(createShowSchema.safeParse({ ...baseShow, posterImage: pngDataUrl }).success).toBe(false);
    expect(createShowSchema.safeParse({ ...baseShow, posterImage: spoofedJpegDataUrl }).success).toBe(false);
    expect(createShowSchema.safeParse({ ...baseShow, posterImage: oversizedDataUrl }).success).toBe(false);
  });
});
