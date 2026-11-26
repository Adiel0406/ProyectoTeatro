export const MAIN_PAGES = [
  { slug: "home", path: "/", label: "Inicio" },
  { slug: "catalog", path: "/cartelera", label: "Cartelera" },
  { slug: "experience", path: "/experiencia", label: "La experiencia" },
  { slug: "archive", path: "/archivo", label: "Archivo" },
  { slug: "workshops", path: "/talleres", label: "Talleres" },
  { slug: "faq", path: "/preguntas", label: "Preguntas frecuentes" },
] as const;

export type MainPage = (typeof MAIN_PAGES)[number]["slug"];
export type AppPage = MainPage | "admin" | "profile";

export function resolveAppPage(path: string): AppPage {
  const normalizedPath = path.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/admin") return "admin";
  if (normalizedPath === "/perfil") return "profile";
  return MAIN_PAGES.find((page) => page.path === normalizedPath)?.slug ?? "home";
}
