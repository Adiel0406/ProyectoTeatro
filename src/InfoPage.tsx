import { useEffect, useState } from "react";
import bodasDeSangre from "../assets/image/bodasdesangre.jpg";
import cepilloDeDientes from "../assets/image/cepillodedientes.jpeg";
import galeria1 from "../assets/image/galeria1.jpg";
import galeria2 from "../assets/image/galeria2.jpg";
import galeria3 from "../assets/image/galeria3.jpg";
import galeria4 from "../assets/image/galeria4.jpg";
import galeria5 from "../assets/image/galeria5.jpg";
import { INFO_PAGES, type InfoPageSlug } from "./infoPages.ts";
import { useScrollReveal } from "./useScrollReveal.ts";

const PAGE_DETAILS: Record<InfoPageSlug, { eyebrow: string; title: string; intro: string }> = {
  about: {
    eyebrow: "Nuestra escena",
    title: "Un escenario para historias que nos mueven.",
    intro: "Teatro UCB reúne funciones, talleres y encuentros para vivir el arte escénico dentro de la comunidad universitaria.",
  },
  cast: {
    eyebrow: "Quienes hacen la escena",
    title: "Cada montaje se construye en colectivo.",
    intro: "Conoce los créditos publicados de las obras y los equipos que dan forma a cada historia.",
  },
  gallery: {
    eyebrow: "Entre bambalinas",
    title: "Recuerdos que siguen en escena.",
    intro: "Un recorrido por montajes que ya compartieron su historia con el público de Teatro UCB.",
  },
  contact: {
    eyebrow: "Estamos para orientarte",
    title: "Nos encontramos en el teatro.",
    intro: "Consulta la cartelera, reserva tus butacas o postula a uno de los talleres desde los canales disponibles en la plataforma.",
  },
};

const PRODUCTION_CREDITS = [
  {
    title: "El santo del cuerno",
    category: "En cartelera",
    credit: "Dramaturgia de David Mondacca Arauz",
  },
  {
    title: "Una noche de verano",
    category: "En cartelera",
    credit: "Dramaturgia del Taller de Dramaturgia UCB",
  },
  {
    title: "Voces del Altiplano",
    category: "En cartelera",
    credit: "Dramaturgia del Taller de Dramaturgia UCB",
  },
  {
    title: "Bodas de Sangre",
    category: "Archivo · Temporada 2025",
    credit: "Federico García Lorca · Elenco Universitario UCB",
  },
  {
    title: "El Cepillo de Dientes",
    category: "Archivo · Temporada 2025",
    credit: "Jorge Díaz · Dirección: Lic. Sofía Montenegro",
  },
];

const GALLERY_ITEMS = [
  {
    src: galeria1,
    alt: "Dos intérpretes en una escena iluminada de rojo",
    title: "Escena en rojo",
    detail: "Un momento sobre el escenario",
  },
  {
    src: galeria2,
    alt: "Elenco en movimiento durante una presentación",
    title: "Cuerpo en movimiento",
    detail: "El elenco en acción",
  },
  {
    src: galeria3,
    alt: "Elenco reunido sobre el escenario con luces violetas",
    title: "Encuentro en escena",
    detail: "Una historia compartida",
  },
  {
    src: galeria4,
    alt: "Intérpretes reunidos bajo luces verdes",
    title: "Bajo luces verdes",
    detail: "Trabajo de elenco",
  },
  {
    src: galeria5,
    alt: "Dos personajes en una escena teatral iluminada de verde",
    title: "Entre personajes",
    detail: "Un instante del montaje",
  },
  {
    src: bodasDeSangre,
    alt: "Puesta en escena de Bodas de Sangre",
    title: "Bodas de Sangre",
    detail: "Temporada 2025 · Octubre",
  },
  {
    src: cepilloDeDientes,
    alt: "Montaje escénico de El Cepillo de Dientes",
    title: "El Cepillo de Dientes",
    detail: "Temporada 2025 · Mayo",
  },
];

type ContactGoal = "reserve" | "workshop" | "perform" | "discover";
type ContactTiming = "soon" | "later" | "exploring";

const CONTACT_RECOMMENDATIONS: Record<ContactGoal, { title: string; detail: string; href: string; label: string }> = {
  reserve: {
    title: "Tu próxima historia empieza en la cartelera.",
    detail: "Revisa las obras y elige la función que te gustaría disfrutar.",
    href: "/#cartelera",
    label: "Explorar cartelera",
  },
  workshop: {
    title: "Hay un taller esperando por ti.",
    detail: "Conoce las opciones disponibles y encuentra dónde empezar.",
    href: "/#talleres",
    label: "Ver talleres",
  },
  perform: {
    title: "El elenco es un buen lugar para comenzar.",
    detail: "Descubre quiénes dan vida a las obras de Teatro UCB.",
    href: "/elenco",
    label: "Conocer el elenco",
  },
  discover: {
    title: "Te damos la bienvenida a Teatro UCB.",
    detail: "Conoce el espacio, sus actividades y las historias que nos reúnen.",
    href: "/sobre-teatro",
    label: "Sobre el teatro",
  },
};

const CONTACT_TIMING_COPY: Record<ContactTiming, string> = {
  soon: "Como quieres empezar pronto, revisa las actividades disponibles ahora.",
  later: "Puedes guardar esta ruta y volver cuando se acerque el momento.",
  exploring: "Explora con calma; siempre habrá una historia nueva por descubrir.",
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

export function InfoPage({ page }: { page: InfoPageSlug }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const [contactGoal, setContactGoal] = useState<ContactGoal>("reserve");
  const [contactTiming, setContactTiming] = useState<ContactTiming>("soon");
  const [contactRecommendation, setContactRecommendation] = useState<ContactGoal | null>(null);
  const details = PAGE_DETAILS[page];
  useScrollReveal(page);

  useEffect(() => {
    document.title = `${details.eyebrow} | Teatro UCB`;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#121212" : "#f7f4ee",
    );
  }, [details.eyebrow, theme]);

  return (
    <div className="info-site">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <a className="brand" href="/#inicio" aria-label="Teatro UCB, inicio">
          <img className="brand__mark" src="/teatro-ucb.svg" alt="" />
          <span className="brand__name">TEATRO <strong>UCB</strong></span>
        </a>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="info-navigation"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
        <nav
          className={`site-nav${menuOpen ? " is-open" : ""}`}
          id="info-navigation"
          aria-label="Navegación principal"
        >
          <a className="site-nav__link" href="/#cartelera" onClick={() => setMenuOpen(false)}>
            Cartelera
          </a>
          {INFO_PAGES.map((item) => (
            <a
              className={`site-nav__link${page === item.slug ? " is-active" : ""}`}
              href={item.path}
              key={item.slug}
              aria-current={page === item.slug ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <button
            className="button button--small button--theme"
            type="button"
            aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            title={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
          >
            <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
          </button>
          <a
            className="button button--small button--gold"
            href="/#cartelera"
            onClick={() => setMenuOpen(false)}
          >
            Reservar
          </a>
        </nav>
      </header>

      <main id="contenido" className="info-page">
        <section className="info-page__hero" aria-labelledby="info-title">
          <div className="info-page__hero-copy">
            <p className="eyebrow"><span className="eyebrow__rule" />{details.eyebrow}</p>
            <h1 id="info-title">{details.title}</h1>
            <p>{details.intro}</p>
            <a className="button button--gold" href="/#cartelera">
              Explorar cartelera <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="info-page__stage" aria-hidden="true">
            <span className="info-page__stage-light" />
            <span className="info-page__stage-mark">T</span>
            <span className="info-page__stage-caption">CULTURA · ARTE · ENCUENTRO</span>
          </div>
        </section>

        {page === "about" && (
          <section className="info-section" aria-labelledby="about-heading">
            <div className="info-section__heading" data-scroll-reveal>
              <p className="eyebrow"><span className="eyebrow__rule" />Más que una función</p>
              <h2 id="about-heading">El teatro se vive en compañía.</h2>
              <p>Un espacio para mirar el mundo desde otras perspectivas y encontrarnos a través de historias.</p>
            </div>
            <div className="info-feature-grid">
              {[
                ["Historias", "Obras de distintos géneros que invitan a descubrir nuevas voces y miradas."],
                ["Encuentro", "Funciones y experiencias compartidas alrededor de la escena universitaria."],
                ["Formación", "Talleres para aprender, ensayar y dar los primeros pasos sobre el escenario."],
              ].map(([title, description], index) => (
                <article className="info-feature" data-scroll-reveal key={title}>
                  <span className="info-feature__number">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {page === "cast" && (
          <section className="info-section" aria-labelledby="cast-heading">
            <div className="info-section__heading" data-scroll-reveal>
              <p className="eyebrow"><span className="eyebrow__rule" />Créditos de escena</p>
              <h2 id="cast-heading">Las voces detrás de cada obra.</h2>
              <p>El elenco y los equipos cambian con cada montaje. Estos son los créditos que aparecen en la cartelera y el archivo.</p>
            </div>
            <div className="info-credits">
              {PRODUCTION_CREDITS.map((production) => (
                <article className="info-credit" data-scroll-reveal key={production.title}>
                  <p className="info-credit__category">{production.category}</p>
                  <h3>{production.title}</h3>
                  <p>{production.credit}</p>
                </article>
              ))}
            </div>
            <a className="button button--outline" href="/#cartelera">
              Ver obras en cartelera <span aria-hidden="true">↗</span>
            </a>
          </section>
        )}

        {page === "gallery" && (
          <section className="info-section" aria-labelledby="gallery-heading">
            <div className="info-section__heading" data-scroll-reveal>
              <p className="eyebrow"><span className="eyebrow__rule" />Archivo visual</p>
              <h2 id="gallery-heading">Un vistazo a temporadas pasadas.</h2>
              <p>Imágenes de montajes que formaron parte de la historia reciente del teatro.</p>
            </div>
            <div className="info-gallery">
              {GALLERY_ITEMS.map((item, index) => (
                <figure className="info-gallery__item" data-scroll-reveal key={item.title}>
                  <div className="info-gallery__image">
                    <img src={item.src} alt={item.alt} loading="lazy" />
                    <span className="info-gallery__index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="info-gallery__spark" aria-hidden="true">✳</span>
                  </div>
                  <figcaption>
                    <span>{item.title}</span>
                    <small>{item.detail}</small>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {page === "contact" && (
          <section className="info-section" aria-labelledby="contact-heading">
            <div className="info-section__heading" data-scroll-reveal>
              <p className="eyebrow"><span className="eyebrow__rule" />Próximo paso</p>
              <h2 id="contact-heading">Cuéntanos qué te gustaría hacer.</h2>
              <p>La plataforma todavía no publica un teléfono ni una dirección general. Puedes contactarnos mediante las gestiones disponibles:</p>
            </div>
            <div className="info-contact-questionnaire" data-scroll-reveal>
              <div className="info-contact-questionnaire__intro">
                <span className="info-contact-card__icon">Tu recorrido · 01</span>
                <h3>Encuentra tu siguiente paso.</h3>
                <p>Responde estas dos preguntas y te guiaremos a la sección indicada.</p>
                <span className="info-contact-questionnaire__duration"><span aria-hidden="true">✦</span> Solo toma unos segundos</span>
              </div>
              <form
                className="info-contact-questionnaire__form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setContactRecommendation(contactGoal);
                }}
              >
                <fieldset className="info-questionnaire__fieldset">
                  <legend><span>01</span> ¿Qué te interesa?</legend>
                  <div className="info-questionnaire__choices">
                    {([
                      ["reserve", "Ver una obra", "Reservar y disfrutar una función", "◉"],
                      ["workshop", "Aprender", "Participar en un taller", "✳"],
                      ["perform", "Subir al escenario", "Conocer el elenco", "✧"],
                      ["discover", "Explorar", "Conocer el teatro", "⌂"],
                    ] as const).map(([value, title, description, icon]) => (
                      <label className="info-questionnaire__option" key={value}>
                        <input
                          type="radio"
                          name="contact-goal"
                          value={value}
                          checked={contactGoal === value}
                          onChange={() => {
                            setContactGoal(value);
                            setContactRecommendation(null);
                          }}
                        />
                        <span className="info-questionnaire__choice">
                          <span className="info-questionnaire__icon" aria-hidden="true">{icon}</span>
                          <span className="info-questionnaire__option-copy">
                            <strong>{title}</strong>
                            <small>{description}</small>
                          </span>
                          <span className="info-questionnaire__check" aria-hidden="true">✓</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="info-questionnaire__timing">
                  <span><span>02</span> ¿Cuándo te gustaría hacerlo?</span>
                  <select
                    value={contactTiming}
                    onChange={(event) => {
                      const timing = event.currentTarget.value;
                      if (timing === "soon" || timing === "later" || timing === "exploring") {
                        setContactTiming(timing);
                        setContactRecommendation(null);
                      }
                    }}
                  >
                    <option value="soon">Lo antes posible</option>
                    <option value="later">En las próximas semanas</option>
                    <option value="exploring">Solo estoy explorando</option>
                  </select>
                </label>
                <div className="info-questionnaire__actions">
                  <p>Tus respuestas no se envían ni se guardan; solo sirven para recomendarte una sección.</p>
                  <button className="button button--gold" type="submit">
                    Mostrar mi siguiente paso <span aria-hidden="true">↗</span>
                  </button>
                </div>
                {contactRecommendation && (
                  <div className="info-questionnaire__result" role="status" aria-live="polite">
                    <div>
                      <span className="info-questionnaire__result-label">Tu recomendación</span>
                      <h4>{CONTACT_RECOMMENDATIONS[contactRecommendation].title}</h4>
                      <p>{CONTACT_RECOMMENDATIONS[contactRecommendation].detail} {CONTACT_TIMING_COPY[contactTiming]}</p>
                    </div>
                    <a className="button button--outline" href={CONTACT_RECOMMENDATIONS[contactRecommendation].href}>
                      {CONTACT_RECOMMENDATIONS[contactRecommendation].label} <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                )}
              </form>
            </div>
            <div className="info-section__heading info-contact__options-heading" data-scroll-reveal>
              <p className="eyebrow"><span className="eyebrow__rule" />Canales disponibles</p>
              <h2>O ve directo a lo que buscas.</h2>
            </div>
            <div className="info-contact-grid">
              <article className="info-contact-card" data-scroll-reveal>
                <span className="info-contact-card__icon" aria-hidden="true">01</span>
                <h3>Reservas</h3>
                <p>Elige una obra, selecciona tu función y reserva hasta cuatro butacas desde la cartelera.</p>
                <a className="text-link" href="/#cartelera">Ir a la cartelera <span aria-hidden="true">↗</span></a>
              </article>
              <article className="info-contact-card" data-scroll-reveal>
                <span className="info-contact-card__icon" aria-hidden="true">02</span>
                <h3>Talleres</h3>
                <p>Consulta horarios y cupos. Al postular, la coordinación podrá responderte por correo o WhatsApp.</p>
                <a className="text-link" href="/#talleres">Ver talleres <span aria-hidden="true">↗</span></a>
              </article>
              <article className="info-contact-card info-contact-card--venue" data-scroll-reveal>
                <span className="info-contact-card__icon" aria-hidden="true">03</span>
                <h3>Sala Teatro UCB</h3>
                <p>Los talleres informan el lugar en sus detalles. La ubicación física completa no está publicada en esta plataforma.</p>
              </article>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer info-page__footer">
        <a className="brand brand--footer" href="/#inicio">
          <img className="brand__mark" src="/teatro-ucb.svg" alt="" />
          <span className="brand__name">TEATRO <strong>UCB</strong></span>
        </a>
        <nav className="info-page__footer-nav" aria-label="Páginas del teatro">
          {INFO_PAGES.map((item) => (
            <a href={item.path} key={item.slug}>{item.label}</a>
          ))}
        </nav>
        <span className="site-footer__copyright">© {new Date().getFullYear()} Teatro UCB</span>
      </footer>
    </div>
  );
}
