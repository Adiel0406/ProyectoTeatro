import { describe, expect, it } from "vitest";
import { resolveAppPage } from "./mainPages.ts";

describe("resolveAppPage", () => {
  it("resolves the admin and profile screens independently", () => {
    expect(resolveAppPage("/admin")).toBe("admin");
    expect(resolveAppPage("/perfil/")).toBe("profile");
  });

  it("keeps the existing main-page routes and defaults unknown paths to home", () => {
    expect(resolveAppPage("/cartelera")).toBe("catalog");
    expect(resolveAppPage("/not-found")).toBe("home");
  });
});
