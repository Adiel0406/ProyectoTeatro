import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  apiRequest,
  type AccountReservation,
  type UserAccessEvent,
  type UserProfile,
} from "./api.ts";
import type { ToastTone } from "./Toast.tsx";

function formatProfileDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UserProfileDialog({
  onClose,
  notify,
}: {
  onClose: () => void;
  notify: (message: string, tone?: ToastTone) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reservations, setReservations] = useState<AccountReservation[]>([]);
  const [accessEvents, setAccessEvents] = useState<UserAccessEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewSubmittingId, setReviewSubmittingId] = useState("");
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    void Promise.all([
      apiRequest<{ user: UserProfile }>("/account/profile"),
      apiRequest<{ reservations: AccountReservation[]; accessEvents: UserAccessEvent[] }>(
        "/account/history",
      ),
    ])
      .then(([{ user }, history]) => {
        setProfile(user);
        setReservations(history.reservations);
        setAccessEvents(history.accessEvents);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu perfil.");
      })
      .finally(() => setLoading(false));
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const clean = (key: string) => String(formData.get(key) ?? "").trim() || null;
    try {
      const result = await apiRequest<{ user: UserProfile }>("/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: clean("displayName"),
          bio: clean("bio"),
          favoriteQuote: clean("favoriteQuote"),
        }),
      });
      setProfile(result.user);
      notify("Tu perfil fue actualizado.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "No se pudo guardar tu perfil.";
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async (
    event: FormEvent<HTMLFormElement>,
    performanceId: string,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setReviewSubmittingId(performanceId);
    setReviewError("");
    try {
      const result = await apiRequest<{ review: NonNullable<AccountReservation["performance"]["review"]> }>(
        "/account/reviews",
        {
          method: "POST",
          body: JSON.stringify({
            performanceId,
            rating: Number(formData.get("rating")),
            comment: String(formData.get("comment") ?? ""),
          }),
        },
      );
      setReservations((current) => current.map((reservation) =>
        reservation.performance.id === performanceId
          ? { ...reservation, performance: { ...reservation.performance, review: result.review } }
          : reservation,
      ));
      form.reset();
      notify("Tu opinión fue enviada de forma privada al equipo del teatro.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "No se pudo enviar la opinión.";
      setReviewError(message);
      notify(message, "error");
    } finally {
      setReviewSubmittingId("");
    }
  };

  const completedPerformances = Array.from(
    reservations.reduce((unique, reservation) => {
      const performanceId = reservation.performance.id;
      if (
        new Date(reservation.performance.endsAt).getTime() <= Date.now() &&
        !unique.has(performanceId)
      ) {
        unique.set(performanceId, reservation);
      }
      return unique;
    }, new Map<string, AccountReservation>()).values(),
  );

  return (
    <dialog
      className="dialog profile-dialog"
      ref={dialogRef}
      aria-labelledby="profile-title"
      onCancel={onClose}
    >
      <div className="dialog__panel">
        <button className="dialog__close" type="button" aria-label="Cerrar perfil" onClick={onClose}>×</button>
        <p className="eyebrow"><span className="eyebrow__rule" />Tu espacio</p>
        <h2 id="profile-title">Mi <em>perfil.</em></h2>
        {loading ? (
          <p className="admin-empty">Cargando perfil e historial...</p>
        ) : profile ? (
          <>
            <p className="profile-identity">
              Cuenta CI {profile.ci} · creada {formatProfileDate(profile.createdAt)}
            </p>
            <section className="admin-section" aria-labelledby="profile-editor-title">
              <h3 id="profile-editor-title" className="profile-section-title">Personaliza tu perfil</h3>
              <form className="admin-form profile-form" onSubmit={(event) => void saveProfile(event)}>
                <label>
                  Nombre para mostrar
                  <input name="displayName" maxLength={80} defaultValue={profile.displayName ?? ""} />
                </label>
                <label className="admin-form__wide">
                  Sobre mí
                  <textarea name="bio" maxLength={500} rows={3} defaultValue={profile.bio ?? ""} />
                </label>
                <label className="admin-form__wide">
                  Frase favorita
                  <input name="favoriteQuote" maxLength={160} defaultValue={profile.favoriteQuote ?? ""} />
                </label>
                <button className="button button--gold" type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar perfil"}
                </button>
              </form>
            </section>
            <section className="admin-section" aria-labelledby="profile-reservations-title">
              <h3 id="profile-reservations-title" className="profile-section-title">Mi historial de funciones</h3>
              {reservations.length === 0 ? (
                <p className="admin-empty">Las reservas realizadas con tu sesión aparecerán aquí.</p>
              ) : (
                <div className="profile-history">
                  {reservations.map((reservation) => (
                    <article className="profile-history__item" key={reservation.id}>
                      <div>
                        <strong>{reservation.performance.show.title}</strong>
                        <span>{formatProfileDate(reservation.performance.startsAt)} · Butacas {reservation.seatCodes.join(", ")}</span>
                        <small>Reserva {reservation.confirmationCode} · creada {formatProfileDate(reservation.createdAt)}</small>
                      </div>
                      <strong>Bs {reservation.totalAmount}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="admin-section" aria-labelledby="profile-access-title">
              <h3 id="profile-access-title" className="profile-section-title">Actividad de la cuenta</h3>
              {accessEvents.length === 0 ? (
                <p className="admin-empty">Todavía no hay actividad registrada.</p>
              ) : (
                <ul className="profile-access-list">
                  {accessEvents.map((item) => (
                    <li key={item.id}>
                      {item.type === "LOGIN" ? "Inicio de sesión" : "Cuenta creada"}
                      <time dateTime={item.createdAt}>{formatProfileDate(item.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="admin-section" aria-labelledby="profile-reviews-title">
              <h3 id="profile-reviews-title" className="profile-section-title">Opiniones de funciones finalizadas</h3>
              <p className="profile-identity">Solo el equipo administrador podrá leer tus opiniones.</p>
              {completedPerformances.length === 0 ? (
                <p className="admin-empty">Cuando termine una función que reservaste, podrás compartir tu opinión aquí.</p>
              ) : (
                <div className="profile-history">
                  {completedPerformances.map((reservation) => (
                    <article className="profile-review" key={reservation.performance.id}>
                      <div>
                        <strong>{reservation.performance.show.title}</strong>
                        <span>{formatProfileDate(reservation.performance.startsAt)}</span>
                      </div>
                      {reservation.performance.review ? (
                        <div className="profile-review__submitted" role="status">
                          <strong>Tu valoración: {reservation.performance.review.rating}/5</strong>
                          <p>{reservation.performance.review.comment}</p>
                          <small>Enviada {formatProfileDate(reservation.performance.review.createdAt)}</small>
                        </div>
                      ) : (
                        <form
                          className="admin-form profile-review__form"
                          onSubmit={(event) => void submitReview(event, reservation.performance.id)}
                        >
                          <label>
                            Valoración
                            <select name="rating" defaultValue="5">
                              {[5, 4, 3, 2, 1].map((rating) => (
                                <option value={rating} key={rating}>{rating} de 5</option>
                              ))}
                            </select>
                          </label>
                          <label className="admin-form__wide">
                            Tu opinión
                            <textarea name="comment" minLength={10} maxLength={1200} rows={3} required />
                          </label>
                          {reviewError && <p className="form-feedback admin-form__wide" role="alert">{reviewError}</p>}
                          <button
                            className="button button--gold"
                            type="submit"
                            disabled={reviewSubmittingId === reservation.performance.id}
                          >
                            {reviewSubmittingId === reservation.performance.id ? "Enviando..." : "Enviar opinión"}
                          </button>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <p className="form-feedback" role="alert">{error || "No se pudo cargar tu perfil."}</p>
        )}
        {error && profile && <p className="form-feedback" role="alert">{error}</p>}
      </div>
    </dialog>
  );
}
