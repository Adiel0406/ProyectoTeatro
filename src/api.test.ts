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

  it("reports empty or invalid error responses without leaking JSON parse failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    await expect(apiRequest("/shows")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "El servidor devolvió un error HTTP 500 sin detalles.",
    } satisfies Partial<ApiError>);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("<html>error</html>", { status: 502 }),
    ));
    await expect(apiRequest("/workshops")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      message: "El servidor devolvió un error HTTP 502 sin detalles.",
    } satisfies Partial<ApiError>);
  });

  it("turns network failures into a clear connection error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(apiRequest("/shows")).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    } satisfies Partial<ApiError>);
  });

  it("rejects malformed successful responses explicitly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("", { status: 200 }),
    ));

    await expect(apiRequest("/shows")).rejects.toMatchObject({
      name: "ApiError",
      status: 200,
      message: "El servidor devolvió una respuesta inválida.",
    } satisfies Partial<ApiError>);
  });
});
