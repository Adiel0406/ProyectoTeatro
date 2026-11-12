import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  apiRequest,
  ApiError,
  type Genre,
  type PerformanceDetail,
  type Show,
  type Workshop,
} from "./api.ts";

const GENRE_LABELS: Record<Genre, string> = {
  drama: "Drama",
  comedia: "Comedia",
  musical: "Musical",
};

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
    <div className="section-heading">
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
  const [announcement, setAnnouncement] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const loadCatalog = async (signal?: AbortSignal) => {
    setLoading(true);
    setCatalogError("");
    try {
      const [showData, workshopData] = await Promise.all([
        apiRequest<Show[]>("/shows", { signal }),
        apiRequest<Workshop[]>("/workshops", { signal }),
      ]);
      setShows(showData);
      setWorkshops(workshopData);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setCatalogError(
        error instanceof Error ? error.message : "No se pudo cargar la cartelera.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredShows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return shows.filter((show) => {
      const matchesSearch = `${show.title} ${show.playwright}`
        .toLocaleLowerCase("es")
        .includes(query);
      return matchesSearch && (genre === "all" || show.genre === genre);
    });
  }, [genre, search, shows]);

  const handleReserved = async (confirmationCode: string) => {
    setSelectedShow(null);
    setAnnouncement(`Reserva confirmada. Tu código es ${confirmationCode}.`);
    await loadCatalog();
  };

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Teatro UCB, inicio">
          <span className="brand__mark" aria-hidden="true">T</span>
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
              className="site-nav__link"
              href={href}
              key={href}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <a
            className="button button--small button--gold"
            href="#cartelera"
            onClick={() => setMenuOpen(false)}
          >
            Ver funciones
          </a>
        </nav>
      </header>

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
          {announcement && <p className="sr-status" role="status">{announcement}</p>}

          <div className="show-grid" aria-busy={loading}>
            {filteredShows.map((show, index) => {
              const nextPerformance = show.performances[0];
              return (
                <article className="show-card" data-genre={show.genre} key={show.id}>
                  <div
                    className={`show-card__poster poster poster--${show.posterStyle}`}
                    role="img"
                    aria-label={`Afiche de ${show.title}`}
                  >
                    <span className="poster__topline">TEATRO UCB PRESENTA</span>
                    <span className="poster__symbol" aria-hidden="true">✳</span>
                    <span className="poster__title">{show.title}</span>
                    <span className="poster__credit">{show.playwright}</span>
                    <span className="poster__number">{String(index + 1).padStart(2, "0")}</span>
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
              <p>Prueba con otro nombre o género, o limpia los filtros.</p>
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
          <div className="experience__content">
            <p className="eyebrow eyebrow--light"><span className="eyebrow__rule" />Más que una función</p>
            <h2 id="experience-title">El teatro se vive<br />en <em>compañía.</em></h2>
            <p>Ven por la historia. Quédate por lo que despierta. Nos encontramos bajo el mismo telón.</p>
            <a className="text-link" href="#cartelera">Encuentra tu próxima función <span aria-hidden="true">↗</span></a>
          </div>
          <div className="experience__ornament" aria-hidden="true">
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
              aside={"Lo que ya pasó por el escenario\ny lo que dijo el público."}
            />
            <div className="archive-list">
              <ArchiveItem
                image="/assets/image/bodasdesangre.jpg"
                alt="Puesta en escena de Bodas de Sangre"
                date="Octubre 2025"
                title="Bodas de Sangre"
                credit="Federico García Lorca · Elenco Universitario UCB"
                review="Una interpretación visceral e impactante. El uso de la iluminación y la escenografía transmite toda la tensión dramática."
                author="Camila A. Muñoz"
              />
              <ArchiveItem
                image="/assets/image/cepillodedientes.jpeg"
                alt="Montaje escénico de El Cepillo de Dientes"
                date="Mayo 2025"
                title="El Cepillo de Dientes"
                credit="Jorge Díaz · Dirección: Lic. Sofía Montenegro"
                review="Una comedia absurda y efervescente. El ritmo no decae y las actuaciones llenan la sala."
                author="Alison Márquez"
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
                  <details className="accordion-card workshop" key={workshop.id}>
                    <summary className="accordion-card__summary">
                      <div className="workshop__header">
                        <span className="workshop__title">{workshop.title}</span>
                        <span className="workshop__badge">
                          {workshop.schedule} · {remaining} disponibles
                        </span>
                      </div>
                      <span className="accordion-card__icon" aria-hidden="true" />
                    </summary>
                    <div className="accordion-card__body">
                      <p><strong>Descripción:</strong> {workshop.description}</p>
                      <p><strong>Docente:</strong> {workshop.teacher}</p>
                      <button
                        className="button button--amber"
                        type="button"
                        disabled={remaining === 0}
                        onClick={() => setSelectedWorkshop(workshop)}
                      >
                        Inscribirme <span aria-hidden="true">→</span>
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
            <details className="accordion-card faq-card">
              <summary className="accordion-card__summary">
                <span className="faq-card__question">¿Cómo funciona la reserva de butacas?</span>
                <span className="accordion-card__icon" aria-hidden="true" />
              </summary>
              <div className="accordion-card__body">
                <p>Selecciona una función y hasta cuatro butacas disponibles. Recibirás un código de confirmación; los pagos aún no se procesan en línea.</p>
              </div>
            </details>
            <details className="accordion-card faq-card">
              <summary className="accordion-card__summary">
                <span className="faq-card__question">¿Necesito experiencia para inscribirme a los talleres?</span>
                <span className="accordion-card__icon" aria-hidden="true" />
              </summary>
              <div className="accordion-card__body">
                <p>Los requisitos y horarios aparecen en la descripción de cada taller. Algunos cursos son aptos para principiantes.</p>
              </div>
            </details>
            <details className="accordion-card faq-card">
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
          <span className="brand__mark" aria-hidden="true">T</span>
          <span className="brand__name">TEATRO <strong>UCB</strong></span>
        </a>
        <p>Una universidad, muchas historias.</p>
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
            setAnnouncement(message);
            void loadCatalog();
          }}
        />
      )}
    </>
  );
}

function ArchiveItem({
  image,
  alt,
  date,
  title,
  credit,
  review,
  author,
}: {
  image: string;
  alt: string;
  date: string;
  title: string;
  credit: string;
  review: string;
  author: string;
}) {
  return (
    <article className="archive-item">
      <figure className="archive-item__figure">
        <img className="archive-item__img" src={image} alt={alt} loading="lazy" />
        <figcaption>
          <span className="archive-item__tag">Temporada 2025</span>
          <span>{date}</span>
        </figcaption>
      </figure>
      <div className="archive-item__content">
        <header>
          <h3>{title}</h3>
          <p className="archive-item__sub">{credit}</p>
        </header>
        <section>
          <h4>Reseña del público</h4>
          <article className="review">
            <header className="review__header">
              <p className="review__author">{author}</p>
              <span>Temporada 2025</span>
            </header>
            <blockquote className="review__text">“{review}”</blockquote>
          </article>
        </section>
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
      setSelectedSeats((current) => current.filter((seat) => seat !== code));
      return;
    }
    if (selectedSeats.length === 4) {
      setFeedback("Puedes reservar hasta cuatro butacas por función.");
      return;
    }
    setSelectedSeats((current) => [...current, code]);
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

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      aria-labelledby="booking-title"
      onCancel={onClose}
    >
      <div className="dialog__panel dialog__panel--booking">
        <button className="dialog__close" type="button" aria-label="Cerrar reserva" onClick={onClose}>×</button>
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
                {formatDate(item.startsAt)} · {item.venue} · {item.availableSeats} disponibles
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
    </dialog>
  );
}

function WorkshopDialog({
  workshop,
  onClose,
  onApplied,
}: {
  workshop: Workshop;
  onClose: () => void;
  onApplied: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    try {
      await apiRequest<{ message: string }>("/workshop-applications", {
        method: "POST",
        body: JSON.stringify({ workshopId: workshop.id, name, email }),
      });
      onApplied(`Solicitud enviada para “${workshop.title}”.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog className="dialog" ref={dialogRef} aria-labelledby="workshop-dialog-title" onCancel={onClose}>
      <div className="dialog__panel dialog__panel--workshop">
        <button className="dialog__close" type="button" aria-label="Cerrar inscripción" onClick={onClose}>×</button>
        <p className="eyebrow"><span className="eyebrow__rule" />Inscripción</p>
        <h2 id="workshop-dialog-title">Reserva tu <em>lugar.</em></h2>
        <p>{workshop.title} · {workshop.schedule}</p>
        <form className="reservation-fields workshop-form" onSubmit={(event) => void submitApplication(event)}>
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
          {feedback && <p className="form-feedback" role="alert">{feedback}</p>}
          <button className="button button--gold" type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </div>
    </dialog>
  );
}

export default App;
