import { describe, expect, it } from "vitest";
import { reservationSchema } from "./schemas.ts";

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
