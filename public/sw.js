// Service Worker — Teatro UCB
// Estrategia: Cache-First para assets estáticos, Network-First para API

const CACHE_VERSION = "teatro-ucb-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets que siempre deben estar disponibles sin internet
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/teatro-ucb.svg",
];

// ─── Instalación: pre-cachear el shell de la app ──────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_ASSETS)
    ).then(() => self.skipWaiting())
  );
});

// ─── Activación: limpiar cachés viejos ────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("teatro-ucb-") && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: estrategias por tipo de recurso ───────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones no-GET y extensiones de desarrollo
  if (request.method !== "GET") return;
  if (url.hostname === "localhost" && url.port === "5173") return;

  // Rutas de API → Network-First con caché de respaldo
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Google Fonts → Cache-First (crítico para modo offline)
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirstFonts(request));
    return;
  }

  // Assets estáticos (JS, CSS, imágenes) → Cache-First
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  // Navegación (HTML) → Network-First, fallback al shell cacheado
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }
});

// ─── Estrategias ──────────────────────────────────────────────────────────────

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Asset no disponible sin conexión.", { status: 503 });
  }
}

async function cacheFirstFonts(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin conexión y sin caché → retornar vacío (la fuente de respaldo CSS se usará)
    return new Response("", { status: 200, headers: { "Content-Type": "text/css" } });
  }
}

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Solo cachear GETs de catálogo público (shows y workshops)
      const url = new URL(request.url);
      if (url.pathname === "/api/shows" || url.pathname === "/api/workshops") {
        const cache = await caches.open(API_CACHE);
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    // Sin red → intentar servir desde caché
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: { message: "Sin conexión a internet. Mostrando datos guardados." } }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match("/") || await caches.match("/index.html");
    if (cached) return cached;
    return new Response(
      "<html><body><p>Teatro UCB no está disponible sin conexión. Recarga cuando tengas internet.</p></body></html>",
      { status: 503, headers: { "Content-Type": "text/html" } }
    );
  }
}
