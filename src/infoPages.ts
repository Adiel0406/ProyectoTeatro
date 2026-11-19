export const INFO_PAGES = [
  { slug: "about", path: "/sobre-teatro", label: "Sobre el teatro" },
  { slug: "cast", path: "/elenco", label: "Elenco" },
  { slug: "gallery", path: "/galeria", label: "Galería" },
  { slug: "contact", path: "/contacto", label: "Contacto" },
] as const;

export type InfoPageSlug = (typeof INFO_PAGES)[number]["slug"];
