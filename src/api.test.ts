import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError } from "./api.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("includes server validation details in API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        error: {
          message: "Revisa los datos enviados.",
          details: [{ path: "startsAt", message: "La función debe tener una fecha futura." }],
        },
      }), { status: 400, headers: { "Content-Type": "application/json" } }),
    ));

    await expect(apiRequest("/admin/shows", { method: "POST" })).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Revisa los datos enviados. startsAt: La función debe tener una fecha futura.",
    } satisfies Partial<ApiError>);
  });
});
