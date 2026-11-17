import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./security.ts";

describe("authentication primitives", () => {
  it("stores verifiable password hashes without storing the password", async () => {
    const password = "theatre-account-password";
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("another-password", hash)).toBe(false);
  });

  it("creates opaque session tokens and stable token digests", () => {
    const token = createOpaqueToken();
    expect(token).toMatch(/^[\da-zA-Z_-]{40,60}$/);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });
});
