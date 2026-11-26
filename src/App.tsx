import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  apiRequest,
  ApiError,
  type AuthUser,
  type Genre,
  type PerformanceDetail,
  type Show,
  type Workshop,
} from "./api.ts";
import { AdminDashboard } from "./AdminDashboard.tsx";
import { AuthDialog } from "./AuthDialog.tsx";
import { INFO_PAGES } from "./infoPages.ts";
import { WorkshopDialog } from "./WorkshopDialog.tsx";
import { UserProfileDialog } from "./UserProfileDialog.tsx";
import { Toast, useToast } from "./Toast.tsx";
import { StagePreview3D } from "./StagePreview3D.tsx";
import bodasDeSangre from "../assets/image/bodasdesangre.jpg";
import cepilloDeDientes from "../assets/image/cepillodedientes.jpeg";
import obra1 from "../assets/image/obra1.jpg";
import obra2 from "../assets/image/obra2.jpg";
import obra3 from "../assets/image/obra3.jpg";
import obra4 from "../assets/image/obra 4.jpg";
import { useScrollReveal } from "./useScrollReveal.ts";

const GENRE_LABELS: Record<Genre, string> = {
  drama: "Drama",
  comedia: "Comedia",
  musical: "Musical",
};

function getInitialTheme(): "dark" | "light" {
  try {
    const savedTheme = window.localStorage.getItem("teatro-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getInitialFavorites(): string[] {
  try {
    const savedFavorites = window.localStorage.getItem("teatro-favorites");
    const parsed: unknown = savedFavorites ? JSON.parse(savedFavorites) : [];
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function getInitialFavoritesOnly(): boolean {
  try {
    return window.localStorage.getItem("teatro-favorites-only") === "true";
  } catch {
    return false;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPrice(value: number) {
  return `Bs ${value}`;
}

function SectionHeading({
  eyebrow,
  title,
  aside,
  headingId,
}: {
  eyebrow: string;
  title: string;
  aside: string;
  headingId: string;
}) {
  return (
    <div className="section-heading" data-scroll-reveal>
      <div>
        <p className="eyebrow">
          <span className="eyebrow__rule" />
          {eyebrow}
        </p>
        <h2 id={headingId}>{title}<span className="heading-period">.</span></h2>
      </div>
      <p className="section-heading__aside">{aside}</p>
    </div>
  );
}

function App() {
  const [shows, setShows] = useState<Show[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<Genre | "all">("all");
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("cartelera");
  const [favorites, setFavorites] = useState<string[]>(getInitialFavorites);
  const [favoritesOnly, setFavoritesOnly] = useState(getInitialFavoritesOnly);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const headerRef = useRef<HTMLElement>(null);
  const { toast, showToast, dismissToast } = useToast();

  const loadCatalog = async (signal?: AbortSignal) => {
    setLoading(true);
    setCatalogError("");
    const [showsResult, workshopsResult] = await Promise.allSettled([
      apiRequest<Show[]>("/shows", { signal }),
      apiRequest<Workshop[]>("/workshops", { signal }),
    ]);
    if (signal?.aborted) return;

    const errors: string[] = [];
    if (showsResult.status === "fulfilled") {
      setShows(showsResult.value);
    } else if (!(showsResult.reason instanceof DOMException && showsResult.reason.name === "AbortError")) {
      errors.push(
        `No se pudo cargar la cartelera: ${showsResult.reason instanceof Error ? showsResult.reason.message : "error inesperado."}`,
      );
    }

    if (workshopsResult.status === "fulfilled") {
      setWorkshops(workshopsResult.value);
    } else if (!(workshopsResult.reason instanceof DOMException && workshopsResult.reason.name === "AbortError")) {
      errors.push(
        `No se pudieron cargar los talleres: ${workshopsResult.reason instanceof Error ? workshopsResult.reason.message : "error inesperado."}`,
      );
    }

    setCatalogError(errors.join(" "));
    setLoading(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ user: AuthUser }>("/auth/me", { signal: controller.signal })
      .then(({ user }) => setCurrentUser(user))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) return;
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          showToast(error instanceof Error ? error.message : "No se pudo verificar la sesión.", "error");
        }
      });
    return () => controller.abort();
  }, [showToast]);

  useEffect(() => {
    const sections = ["cartelera", "experiencia", "archivo", "talleres"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: [0, 0.2, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#121212" : "#f7f4ee",
    );
    try {
      window.localStorage.setItem("teatro-theme", theme);
    } catch {
      showToast("El tema cambiará, pero este navegador no permite guardarlo.", "error");
    }
  }, [showToast, theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem("teatro-favorites", JSON.stringify(favorites));
      window.localStorage.setItem("teatro-favorites-only", String(favoritesOnly));
    } catch {
      showToast("No se pudieron guardar tus preferencias de cartelera en este navegador.", "error");
    }
  }, [favorites, favoritesOnly, showToast]);

  const filteredShows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return shows.filter((show) => {
      const matchesSearch = `${show.title} ${show.playwright}`
        .toLocaleLowerCase("es")
        .includes(query);
      const matchesGenre = genre === "all" || show.genre === genre;
      const matchesFavorites = !favoritesOnly || favorites.includes(show.id);
      return matchesSearch && matchesGenre && matchesFavorites;
    });
  }, [favorites, favoritesOnly, genre, search, shows]);

  const revealRevision = [
    filteredShows.map((show) => show.id).join(":"),
    workshops.map((workshop) => workshop.id).join(":"),
  ].join("|");
  useScrollReveal(revealRevision);

  const toggleFavorite = (showId: string) => {
    setFavorites((current) => current.includes(showId)
      ? current.filter((id) => id !== showId)
      : [...current, showId]);
  };

  const handleReserved = async (confirmationCode: string) => {
    setSelectedShow(null);
    showToast(`Reserva confirmada. Tu código es ${confirmationCode}.`);
    await loadCatalog();
  };

  const handleLogout = async () => {
    try {
      await apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
      setCurrentUser(null);
      showToast("Cerraste sesión correctamente.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo cerrar la sesión.", "error");
    }
  };

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header" ref={headerRef}>
        <a className="brand" href="#inicio" aria-label="Teatro UCB, inicio">
          <img className="brand__mark" src="/teatro-ucb.svg" alt="" />
          <span className="brand__name">TEATRO <strong>UCB</strong></span>
        </a>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
        <nav
          className={`site-nav${menuOpen ? " is-open" : ""}`}
          id="primary-navigation"
          aria-label="Navegación principal"
        >
          {[
            ["Cartelera", "#cartelera"],
            ["La experiencia", "#experiencia"],
            ["Archivo", "#archivo"],
            ["Talleres", "#talleres"],
          ].map(([label, href]) => (
            <a
              className={`site-nav__link${activeSection === href.slice(1) ? " is-active" : ""}`}
              href={href}
              key={href}
              aria-current={activeSection === href.slice(1) ? "location" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <details className="site-nav__pages">
            <summary className="site-nav__link">Descubre</summary>
            <div className="site-nav__submenu">
              {INFO_PAGES.map((page) => (
                <a href={page.path} key={page.slug}>{page.label}</a>
              ))}
            </div>
          </details>
          {(currentUser?.role === "ADMIN" || currentUser?.role === "SUPERADMIN") && (
            <button
              className="site-nav__action"
              type="button"
              onClick={() => {
                setAdminPanelOpen(true);
                setMenuOpen(false);
              }}
            >
              Panel admin
            </button>
          )}
          {currentUser && (
            <button
              className="site-nav__action"
              type="button"
              onClick={() => {
                setProfilePanelOpen(true);
                setMenuOpen(false);
              }}
            >
              Mi perfil
            </button>
          )}
          {currentUser && <span className="site-nav__user">CI {currentUser.ci}</span>}
          <button
            className="button button--small button--account"
            type="button"
            onClick={() => {
              setMenuOpen(false);
              if (currentUser) void handleLogout();
              else setAuthDialogOpen(true);
            }}
          >
            {currentUser ? "Cerrar sesión" : "Iniciar sesión"}
          </button>
          <button
            className="button button--small button--theme"
            type="button"
            aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            title={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
          >
            <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
            <span className="visually-hidden">{theme === "dark" ? "Tema claro" : "Tema oscuro"}</span>
          </button>
          <a
            className="button button--small button--gold"
            href="#cartelera"
            onClick={() => setMenuOpen(false)}
          >
            Reservar
          </a>
        </nav>
      </header>
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}

      <main id="contenido">
        <section className="hero" id="inicio" aria-labelledby="hero-title">
          <div className="hero__content">
            <p className="eyebrow"><span className="eyebrow__rule" />Temporada escénica 2026</p>
            <h1 id="hero-title">Historias que la gente <br /><em>debe conocer</em></h1>
            <p className="hero__description">
              El teatro no forma actores, forma personas con carácter y conciencia
              para mostrar la realidad del mundo. Encuentra tu próxima función en Teatro UCB.
            </p>
            <a className="button button--gold" href="#cartelera">
              Explorar cartelera <span aria-hidden="true">↗</span>
            </a>
            <div className="hero__note">
              <span className="hero__note-line" aria-hidden="true" />
              <span>El telón está por levantarse</span>
            </div>
          </div>
          <div className="hero__art" aria-hidden="true">
            <div className="hero__halo" />
            <div className="hero__curtain hero__curtain--left" />
            <div className="hero__curtain hero__curtain--right" />
            <div className="hero__stage">
              <span className="hero__stage-light" />
              <span className="hero__stage-copy">Una historia<br />comienza aquí</span>
            </div>
            <span className="hero__art-caption">CULTURA · ARTE · ENCUENTRO</span>
          </div>
          <a className="hero__scroll" href="#cartelera" aria-label="Ir a la cartelera">↓</a>
        </section>

        <section className="lineup section-shell" id="cartelera" aria-labelledby="lineup-title">
          <SectionHeading
            headingId="lineup-title"
            eyebrow="En escena"
            title="La cartelera"
            aside={"Elige una historia.\nNosotros ponemos el escenario."}
          />
          <div className="filters" aria-label="Filtros de cartelera">
            <label className="search-field">
              <span className="visually-hidden">Buscar obras</span>
              <span className="search-field__icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar obra o dramaturgia..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="select-field">
              <span className="visually-hidden">Filtrar por género</span>
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value as Genre | "all")}
              >
                <option value="all">Todos los géneros</option>
                <option value="drama">Drama</option>
                <option value="comedia">Comedia</option>
                <option value="musical">Musical</option>
              </select>
            </label>
            <button
              className={`filter-favorites${favoritesOnly ? " is-active" : ""}`}
              type="button"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((current) => !current)}
            >
              <span aria-hidden="true">♡</span>
              Favoritas <span className="filter-favorites__count">{favorites.length}</span>
            </button>
            <button
              className="filter-reset"
              type="button"
              onClick={() => { setSearch(""); setGenre("all"); }}
            >
              Limpiar filtros
            </button>
          </div>

          <p className="results-count" aria-live="polite">
            {loading ? "Cargando cartelera..." : `${filteredShows.length} ${filteredShows.length === 1 ? "obra disponible" : "obras disponibles"}`}
          </p>
          {catalogError && (
            <div className="api-alert" role="alert">
              <p>{catalogError}</p>
              <button className="button button--outline" type="button" onClick={() => void loadCatalog()}>
                Volver a intentar
              </button>
            </div>
          )}
          <div className="show-grid" aria-busy={loading}>
            {filteredShows.map((show, index) => {
              const nextPerformance = show.performances[0];
              return (
                <article
                  className="show-card"
                  data-genre={show.genre}
                  data-scroll-reveal
                  aria-label={`Obra: ${show.title}`}
                  key={show.id}
                >
                  <div
                    className={`show-card__poster poster poster--${show.posterStyle}${show.posterUrl ? " show-card__poster--image" : ""}`}
                  >
                    {show.posterUrl ? (
                      <>
                        <img
                          className="show-card__poster-backdrop"
                          src={show.posterUrl}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                        />
                        <img
                          className="show-card__poster-img"
                          src={show.posterUrl}
                          alt={`Portada de la obra ${show.title}`}
                          loading="lazy"
                        />
                      </>
                    ) : (
                      <>
                        <span className="poster__topline">TEATRO UCB PRESENTA</span>
                        <span className="poster__symbol" aria-hidden="true">✳</span>
                        <span className="poster__title">{show.title}</span>
                        <span className="poster__credit">{show.playwright}</span>
                        <span className="poster__number">{String(index + 1).padStart(2, "0")}</span>
                      </>
                    )}
                    <button
                      className={`favorite-toggle${favorites.includes(show.id) ? " is-active" : ""}`}
                      type="button"
                      aria-label={favorites.includes(show.id)
                        ? `Quitar ${show.title} de favoritas`
                        : `Guardar ${show.title} en favoritas`}
                      aria-pressed={favorites.includes(show.id)}
                      onClick={() => toggleFavorite(show.id)}
                    >
                      {favorites.includes(show.id) ? "♥" : "♡"}
                    </button>
                  </div>
                  <div className="show-card__body">
                    <div className="show-card__meta">
                      <span className={`genre-tag genre-tag--${show.genre}`}>
                        {GENRE_LABELS[show.genre]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{show.duration} min</span>
                    </div>
                    <h3>{show.title}</h3>
                    <p className="show-card__author">Dramaturgia de <span>{show.playwright}</span></p>
                    <p className="show-card__synopsis">{show.synopsis}</p>
                    <div className="show-card__footer">
                      <span className="show-card__date">
                        <span className="show-card__date-label">Próxima función</span>
                        <time dateTime={nextPerformance?.startsAt}>
                          {nextPerformance ? formatDate(nextPerformance.startsAt) : "Próximamente"}
                        </time>
                        {nextPerformance && (
                          <span className="show-card__expiry">
                            Hasta {new Intl.DateTimeFormat("es-BO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(nextPerformance.endsAt))}
                          </span>
                        )}
                      </span>
                      <span className="show-card__date-label">
                        {nextPerformance ? `${nextPerformance.availableSeats} butacas` : "Sin funciones"}
                      </span>
                    </div>
                    <button
                      className="button button--burgundy"
                      type="button"
                      disabled={!nextPerformance || nextPerformance.availableSeats === 0}
                      onClick={() => setSelectedShow(show)}
                    >
                      Reservar butacas <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!loading && !catalogError && filteredShows.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true">✳</span>
              <h3>No encontramos esa obra</h3>
              <p>{favoritesOnly && favorites.length === 0
                ? "Guarda una obra con el corazón para encontrarla aquí."
                : "Prueba con otro nombre o género, o limpia los filtros."}</p>
              <button
                className="button button--outline"
                type="button"
                onClick={() => { setSearch(""); setGenre("all"); }}
              >
                Ver toda la cartelera
              </button>
            </div>
          )}
        </section>

        <section className="experience" id="experiencia" aria-labelledby="experience-title">
          <div className="experience__content" data-scroll-reveal>
            <p className="eyebrow eyebrow--light"><span className="eyebrow__rule" />Más que una función</p>
            <h2 id="experience-title">El teatro se vive<br />en <em>compañía.</em></h2>
            <p>Ven por la historia. Quédate por lo que despierta. Nos encontramos bajo el mismo telón.</p>
            <a className="text-link" href="#cartelera">Encuentra tu próxima función <span aria-hidden="true">↗</span></a>
          </div>
          <div className="experience__ornament" data-scroll-reveal aria-hidden="true">
            <span className="experience__ring" />
            <span className="experience__star">✳</span>
            <span className="experience__vertical">TEATRO UNIVERSITARIO · UCB</span>
          </div>
        </section>

        <section className="archive" id="archivo" aria-labelledby="archive-title">
          <div className="archive__inner">
            <SectionHeading
              headingId="archive-title"
              eyebrow="Archivo histórico"
              title="Obras pasadas"
              aside={"Postales de las obras\ny momentos que dejaron huella."}
            />
            <p className="archive__note">
              Las impresiones de las obras nuevas son textos editoriales de muestra, no citas reales del público.
            </p>
            <div className="archive-list">
              <ArchiveItem
                image={bodasDeSangre}
                alt="Puesta en escena de Bodas de Sangre"
                tag="Temporada 2025"
                date="Octubre 2025"
                title="Bodas de Sangre"
                credit="Federico García Lorca · Elenco Universitario UCB"
                description="La tragedia de García Lorca llega al escenario en un montaje atravesado por el deseo, el destino y la tradición."
                review="Una interpretación visceral e impactante. El uso de la iluminación y la escenografía transmite toda la tensión dramática."
                author="Camila A. Muñoz"
                poster
              />
              <ArchiveItem
                image={cepilloDeDientes}
                alt="Montaje escénico de El Cepillo de Dientes"
                tag="Temporada 2025"
                date="Mayo 2025"
                title="El Cepillo de Dientes"
                credit="Jorge Díaz · Dirección: Lic. Sofía Montenegro"
                description="Una pareja convierte la rutina doméstica en un juego absurdo que transforma lo cotidiano en comedia."
                review="Una comedia absurda y efervescente. El ritmo no decae y las actuaciones llenan la sala."
                author="Alison Márquez"
              />
              <ArchiveItem
                image={obra1}
                alt="Afiche de Willy Flores, segundo Premio Nacional de Teatro de Instituciones de Educación Superior"
                tag="Reconocimiento"
                date="2024"
                title="Willy Flores"
                credit="2.º Premio Nacional de Teatro · Instituciones de Educación Superior"
                description="Afiche dedicado a Willy Flores, distinguido en la segunda edición del Premio Nacional de Teatro de Instituciones de Educación Superior."
                reviewLabel="Impresión editorial"
                review="El afiche destaca el reconocimiento de Willy Flores y su lugar en el teatro universitario."
                poster
              />
              <ArchiveItem
                image={obra2}
                alt="Afiche de Ridens Populus del Taller de Teatro UCB"
                tag="Taller UCB"
                date="22 y 23 de mayo"
                title="Ridens Populus"
                credit="Dirección: David Mondacca"
                description="Fragmento de El juego que todos jugamos, de Alejandro Jodorowsky, junto con ejercicios dramáticos del taller."
                reviewLabel="Impresión editorial"
                review="El humor y los ejercicios dramáticos sugieren una propuesta lúdica, abierta a la experimentación."
                poster
              />
              <ArchiveItem
                image={obra3}
                alt="Afiche de la obra Planta Baja con el elenco del Taller de Teatro UCB"
                tag="Festival PAURO"
                date="13 de octubre"
                title="Planta Baja"
                credit="Dramaturgia y dirección: Mauricio Pacheco Ch."
                description="Puesta en escena del Taller de Teatro UCB, presentada en el Teatro del Colegio Marista."
                reviewLabel="Impresión editorial"
                review="La imagen del elenco reunido anticipa una puesta colectiva donde el trabajo en grupo toma protagonismo."
                poster
              />
              <ArchiveItem
                image={obra4}
                alt="Afiche de La Leyenda de Jenecherú con dos intérpretes bajo luz verde"
                tag="41.º Festival PAURO"
                date="23 de octubre · 15:00 y 17:00"
                title="La Leyenda de Jenecherú"
                credit="Dramaturgia y dirección: Mauricio Pacheco Ch."
                description="Obra de teatro presentada en el Teatro del Colegio Marista como parte del 41.º Festival PAURO."
                reviewLabel="Impresión editorial"
                review="La iluminación verde y la presencia de los intérpretes crean una imagen escénica llena de misterio."
                poster
              />
            </div>
          </div>
        </section>

        <section className="lineup section-shell" id="talleres" aria-labelledby="workshops-title">
          <SectionHeading
            headingId="workshops-title"
            eyebrow="Súbete al escenario"
            title="Talleres y convocatorias"
            aside={"Aprende, ensaya\ny forma parte de la compañía."}
          />
          {workshops.length > 0 ? (
            <div className="accordion-group">
              {workshops.map((workshop) => {
                const remaining = Math.max(0, workshop.capacity - workshop.enrolledSeats);
                return (
                  <details className="accordion-card workshop" data-scroll-reveal key={workshop.id}>
                    <summary className="accordion-card__summary">
                      <div className="workshop__header">
                        <span className="workshop__title">{workshop.title}</span>
                        <span className={`workshop__badge ${remaining <= 5 && remaining > 0 ? "workshop__badge--accent" : ""}`}>
                          {workshop.schedule} · {remaining > 0 ? `${remaining} disponibles` : "Cupos agotados"}
                        </span>
                      </div>
                      <span className="accordion-card__icon" aria-hidden="true" />
                    </summary>
                    <div className="accordion-card__body">
                      <p><strong>Descripción:</strong> {workshop.description}</p>
                      <p><strong>Docente a cargo:</strong> {workshop.teacher}</p>
                      <button
                        className="button button--amber"
                        type="button"
                        disabled={remaining === 0}
                        onClick={() => setSelectedWorkshop(workshop)}
                      >
                        {remaining === 0 ? "Sin cupos disponibles" : "Postular a la Convocatoria"} <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : !loading && !catalogError ? (
            <p className="form-feedback">Pronto anunciaremos nuevos talleres.</p>
          ) : null}
        </section>

        <section className="lineup section-shell" id="faq" aria-labelledby="faq-title">
          <SectionHeading
            headingId="faq-title"
            eyebrow="Información útil"
            title="Preguntas frecuentes"
            aside={"Resolvemos tus dudas sobre\nfunciones y talleres."}
          />
          <div className="accordion-group">
            <details className="accordion-card faq-card" data-scroll-reveal>
              <summary className="accordion-card__summary">
                <span className="faq-card__question">¿Cómo funciona la reserva de butacas?</span>
                <span className="accordion-card__icon" aria-hidden="true" />
              </summary>
              <div className="accordion-card__body">
                <p>Selecciona una función y hasta cuatro butacas disponibles. Recibirás un código de confirmación; los pagos aún no se procesan en línea.</p>
              </div>
            </details>
            <details className="accordion-card faq-card" data-scroll-reveal>
              <summary className="accordion-card__summary">
                <span className="faq-card__question">¿Necesito experiencia para inscribirme a los talleres?</span>
                <span className="accordion-card__icon" aria-hidden="true" />
              </summary>
              <div className="accordion-card__body">
                <p>Los requisitos y horarios aparecen en la descripción de cada taller. Algunos cursos son aptos para principiantes.</p>
              </div>
            </details>
            <details className="accordion-card faq-card" data-scroll-reveal>
              <summary className="accordion-card__summary">
                <span className="faq-card__question">¿Puedo elegir butacas para una función agotada?</span>
                <span className="accordion-card__icon" aria-hidden="true" />
              </summary>
              <div className="accordion-card__body">
                <p>El mapa muestra en tiempo real cuáles están disponibles. Si alguien reserva una butaca mientras eliges, el sistema te pedirá actualizar el mapa.</p>
              </div>
            </details>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand brand--footer" href="#inicio">
          <img className="brand__mark" src="/teatro-ucb.svg" alt="" />
          <span className="brand__name">TEATRO <strong>UCB</strong></span>
        </a>
        <p>Una universidad, muchas historias.</p>
        <nav className="site-footer__nav" aria-label="Páginas del teatro">
          {INFO_PAGES.map((page) => (
            <a href={page.path} key={page.slug}>{page.label}</a>
          ))}
        </nav>
        <span className="site-footer__copyright">© 2026 Teatro UCB · Proyecto académico</span>
      </footer>

      {selectedShow && (
        <BookingDialog
          key={selectedShow.id}
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
          onReserved={handleReserved}
        />
      )}
      {selectedWorkshop && (
        <WorkshopDialog
          key={selectedWorkshop.id}
          workshop={selectedWorkshop}
          onClose={() => setSelectedWorkshop(null)}
          onApplied={(message) => {
            setSelectedWorkshop(null);
            showToast(message);
            void loadCatalog();
          }}
        />
      )}
      {authDialogOpen && (
        <AuthDialog
          onClose={() => setAuthDialogOpen(false)}
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setAuthDialogOpen(false);
            showToast(
              user.role === "SUPERADMIN"
                ? "Sesión de superadministrador iniciada."
                : user.role === "ADMIN"
                  ? "Sesión de administrador iniciada."
                  : "Sesión iniciada.",
            );
          }}
        />
      )}
      {adminPanelOpen &&
        (currentUser?.role === "ADMIN" || currentUser?.role === "SUPERADMIN") && (
        <AdminDashboard
          userRole={currentUser.role}
          onClose={() => setAdminPanelOpen(false)}
          onCatalogChanged={() => void loadCatalog()}
          notify={showToast}
        />
      )}
      {profilePanelOpen && currentUser && (
        <UserProfileDialog
          onClose={() => setProfilePanelOpen(false)}
          notify={showToast}
        />
      )}
    </>
  );
}

function ArchiveItem({
  image,
  alt,
  tag,
  date,
  title,
  credit,
  description,
  reviewLabel = "Reseña del público",
  review,
  author,
  poster = false,
}: {
  image: string;
  alt: string;
  tag: string;
  date: string;
  title: string;
  credit: string;
  description?: string;
  reviewLabel?: string;
  review?: string;
  author?: string;
  poster?: boolean;
}) {
  return (
    <article className={`archive-item${poster ? " archive-item--poster" : ""}`}>
      <figure className="archive-item__figure">
        <img className="archive-item__img" src={image} alt={alt} loading="lazy" />
        <figcaption>
          <span className="archive-item__tag">{tag}</span>
          <span>{date}</span>
        </figcaption>
      </figure>
      <div className="archive-item__content">
        <header>
          <h3>{title}</h3>
          <p className="archive-item__sub">{credit}</p>
        </header>
        {description && <p className="archive-item__description">{description}</p>}
        {review && (
          <details className="archive-item__review">
            <summary>{reviewLabel} <span aria-hidden="true">+</span></summary>
            <article className="review">
              {author && (
                <header className="review__header">
                  <p className="review__author">{author}</p>
                </header>
              )}
              <blockquote className="review__text">“{review}”</blockquote>
            </article>
          </details>
        )}
      </div>
    </article>
  );
}

function BookingDialog({
  show,
  onClose,
  onReserved,
}: {
  show: Show;
  onClose: () => void;
  onReserved: (confirmationCode: string) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [performanceId, setPerformanceId] = useState(show.performances[0]?.id ?? "");
  const [performance, setPerformance] = useState<PerformanceDetail | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lastSelectedSeat, setLastSelectedSeat] = useState("");
  const [preview3DOpen, setPreview3DOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (!performanceId) return;
    const controller = new AbortController();
    setLoadingSeats(true);
    setPerformance(null);
    setSelectedSeats([]);
    setLastSelectedSeat("");
    setPreview3DOpen(false);
    setFeedback("");
    void apiRequest<PerformanceDetail>(`/performances/${performanceId}/seats`, {
      signal: controller.signal,
    })
      .then(setPerformance)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFeedback(error instanceof Error ? error.message : "No se pudo cargar el mapa.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSeats(false);
      });
    return () => controller.abort();
  }, [performanceId]);

  const selectedTotal = useMemo(
    () => performance?.seats
      .filter((seat) => selectedSeats.includes(seat.code))
      .reduce((total, seat) => total + seat.price, 0) ?? 0,
    [performance, selectedSeats],
  );

  const toggleSeat = (code: string) => {
    setFeedback("");
    if (selectedSeats.includes(code)) {
      const nextSeats = selectedSeats.filter((seat) => seat !== code);
      setSelectedSeats(nextSeats);
      if (lastSelectedSeat === code) {
        setLastSelectedSeat(nextSeats[nextSeats.length - 1] ?? "");
      }
      return;
    }
    if (selectedSeats.length === 4) {
      setFeedback("Puedes reservar hasta cuatro butacas por función.");
      return;
    }
    setSelectedSeats((current) => [...current, code]);
    setLastSelectedSeat(code);
  };

  const submitReservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!performance || selectedSeats.length === 0) {
      setFeedback("Selecciona al menos una butaca disponible.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    try {
      const result = await apiRequest<{
        confirmationCode: string;
        totalAmount: number;
      }>("/reservations", {
        method: "POST",
        body: JSON.stringify({
          performanceId,
          name,
          email,
          seatCodes: selectedSeats,
        }),
      });
      await onReserved(result.confirmationCode);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "No se pudo completar la reserva.";
      setFeedback(message);
      if (error instanceof ApiError && error.status === 409) {
        setSelectedSeats([]);
        try {
          const freshPerformance = await apiRequest<PerformanceDetail>(
            `/performances/${performanceId}/seats`,
          );
          setPerformance(freshPerformance);
        } catch (refreshError) {
          const refreshMessage = refreshError instanceof Error
            ? refreshError.message
            : "No se pudo actualizar el mapa de butacas.";
          setFeedback(`${message} ${refreshMessage}`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const previewSeatCode = lastSelectedSeat && selectedSeats.includes(lastSelectedSeat)
    ? lastSelectedSeat
    : selectedSeats[0] ?? "";

  return (
    <dialog
      className={`dialog${preview3DOpen ? " dialog--3d" : ""}`}
      ref={dialogRef}
      aria-labelledby="booking-title"
      onCancel={(event) => {
        if (preview3DOpen) {
          event.preventDefault();
          setPreview3DOpen(false);
          return;
        }
        onClose();
      }}
    >
      <div className="dialog__panel dialog__panel--booking">
        <button className="dialog__close" type="button" aria-label="Cerrar reserva" onClick={onClose}>×</button>
        {preview3DOpen && performance && selectedSeats.length > 0 && (
          <StagePreview3D
            showTitle={show.title}
            venue={performance.venue}
            seats={performance.seats}
            selectedSeats={selectedSeats}
            initialSeatCode={previewSeatCode}
            onClose={() => setPreview3DOpen(false)}
          />
        )}
        <div hidden={preview3DOpen}>
          <div className="booking-heading">
            <p className="eyebrow"><span className="eyebrow__rule" />Tu próxima función</p>
            <h2 id="booking-title">Elige tus <em>butacas.</em></h2>
            <p className="booking-show">{show.title}</p>
          </div>
          <form onSubmit={(event) => void submitReservation(event)}>
            <label className="booking-select-label" htmlFor="performance-select">Función</label>
            <select
              className="booking-select"
              id="performance-select"
              value={performanceId}
              onChange={(event) => setPerformanceId(event.target.value)}
            >
              {show.performances.map((item) => (
                <option value={item.id} key={item.id}>
                  {formatDate(item.startsAt)} · termina {new Intl.DateTimeFormat("es-BO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(item.endsAt))} · {item.venue} · {item.availableSeats} disponibles
                </option>
              ))}
            </select>
            <div className="seat-layout">
              <div className="stage-label"><span>ESCENARIO</span></div>
              {loadingSeats && <p className="form-feedback">Cargando butacas...</p>}
              {!loadingSeats && performance && (
                <div
                  className="seat-map"
                  data-distribucion="platea"
                  aria-label={`Mapa de butacas para ${performance.venue}`}
                >
                  <ol className="seat-zone" aria-label="Platea">
                    {performance.seats.map((seat) => {
                      const selected = selectedSeats.includes(seat.code);
                      return (
                        <li className="seat-item" key={seat.id}>
                          <button
                            className="seat"
                            type="button"
                            data-tipo={seat.category === "Preferencial" ? "preferencial" : "silla"}
                            data-estado={seat.status === "RESERVED" ? "ocupada" : selected ? "seleccionada" : "disponible"}
                            aria-pressed={selected}
                            aria-label={`${seat.code}, ${seat.category}, ${formatPrice(seat.price)}, ${seat.status === "RESERVED" ? "ocupada" : selected ? "seleccionada" : "disponible"}`}
                            disabled={seat.status === "RESERVED"}
                            onClick={() => toggleSeat(seat.code)}
                          >
                            <span className="seat__label">{seat.code}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
              <ul className="seat-legend" aria-label="Leyenda del mapa">
                <li><span className="seat-legend__swatch seat-legend__swatch--available" />Disponible</li>
                <li><span className="seat-legend__swatch seat-legend__swatch--selected" />Seleccionada</li>
                <li><span className="seat-legend__swatch seat-legend__swatch--occupied" />Ocupada</li>
              </ul>
              <div className="seat-preview-bar">
                <button
                  className="button button--outline seat-preview-btn"
                  type="button"
                  disabled={loadingSeats || !performance || selectedSeats.length === 0}
                  onClick={() => setPreview3DOpen(true)}
                >
                  <svg className="seat-preview-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
                    <path d="M3 7l9 5 9-5" />
                    <path d="M12 12v10" />
                  </svg>
                  Vista 3D desde tu butaca
                </button>
                <span className="seat-preview-bar__hint">
                  {selectedSeats.length > 0
                    ? `Previsualiza el escenario en 3D desde ${previewSeatCode} antes de confirmar`
                    : "Selecciona una butaca para ver el escenario en 3D desde ese lugar"}
                </span>
              </div>
            </div>
            <div className="booking-summary">
              <span>{selectedSeats.length} {selectedSeats.length === 1 ? "butaca" : "butacas"} seleccionadas</span>
              <strong>{formatPrice(selectedTotal)}</strong>
            </div>
            <div className="reservation-fields">
              <label>
                Nombre completo
                <input
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Correo electrónico
                <input
                  autoComplete="email"
                  type="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>
            {feedback && <p className="form-feedback" role="alert">{feedback}</p>}
            <button
              className="button button--gold button--continue"
              type="submit"
              disabled={submitting || loadingSeats || selectedSeats.length === 0}
            >
              {submitting ? "Confirmando..." : "Confirmar reserva"} <span aria-hidden="true">→</span>
            </button>
            <p className="dialog__hint">No se procesa ningún pago en línea.</p>
          </form>
        </div>
      </div>
    </dialog>
  );
}

export default App;
