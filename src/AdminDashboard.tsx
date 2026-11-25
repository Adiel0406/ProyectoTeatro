import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { apiRequest, type Genre, type Show } from "./api.ts";
import type { ToastTone } from "./Toast.tsx";

interface AdminReservation {
  id: string;
  confirmationCode: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  createdAt: string;
  performance: {
    venue: string;
    startsAt: string;
    endsAt: string;
    show: { title: string };
  };
  seatCodes: string[];
}

interface AdminShow extends Show {
  active: boolean;
}

interface AdminAccessCode {
  id: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdBy: { ci: string };
  usedBy: { ci: string } | null;
}

interface AdminUser {
  id: string;
  ci: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  displayName: string | null;
  bio: string | null;
  favoriteQuote: string | null;
  createdAt: string;
  reservationCount: number;
  accessCount: number;
  lastAccessAt: string | null;
}

interface AdminUserHistory {
  user: Pick<AdminUser, "id" | "ci" | "role" | "displayName" | "bio" | "favoriteQuote" | "createdAt">;
  reservations: AdminReservation[];
  accessEvents: Array<{ id: string; type: "LOGIN" | "REGISTER"; createdAt: string }>;
}

interface AdminReport {
  period: "week" | "month" | "year";
  startsAt: string;
  endsAt: string;
  reservationCount: number;
  reservedAmount: number;
  loginCount: number;
  byShow: Array<{ id: string; title: string; reservationCount: number; amount: number }>;
}

interface AdminAccessEvent {
  id: string;
  type: "LOGIN" | "REGISTER";
  createdAt: string;
  user: { id: string; ci: string; displayName: string | null };
}

const periodLabels = {
  week: "esta semana",
  month: "este mes",
  year: "este año",
};

const genres: Array<{ value: Genre; label: string; apiValue: "DRAMA" | "COMEDIA" | "MUSICAL" }> = [
  { value: "drama", label: "Drama", apiValue: "DRAMA" },
  { value: "comedia", label: "Comedia", apiValue: "COMEDIA" },
  { value: "musical", label: "Musical", apiValue: "MUSICAL" },
];

function formatPerformanceDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const MAX_POSTER_BYTES = 3 * 1024 * 1024;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function readValidatedJpegFile(file: File): Promise<{ dataUrl: string; sizeLabel: string }> {
  const hasValidExtension = /\.(jpe?g)$/i.test(file.name);
  const hasValidMime = file.type === "image/jpeg" || file.type === "";
  if (!hasValidExtension || !hasValidMime) {
    throw new Error("Solo se permiten imágenes en formato JPG (.jpg o .jpeg).");
  }
  if (file.size === 0 || file.size > MAX_POSTER_BYTES) {
    throw new Error("La portada JPG debe pesar como máximo 3 MB.");
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new Error("El archivo seleccionado no es una imagen JPG válida.");
  }

  const dataUrl = `data:image/jpeg;base64,${bytesToBase64(bytes)}`;
  const sizeKb = Math.max(1, Math.round(bytes.length / 1024));
  const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
  return { dataUrl, sizeLabel };
}

function getFormValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function AdminDashboard({
  userRole,
  onClose,
  onCatalogChanged,
  notify,
}: {
  userRole: "ADMIN" | "SUPERADMIN";
  onClose: () => void;
  onCatalogChanged: () => void;
  notify: (message: string, tone?: ToastTone) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isSuperadmin = userRole === "SUPERADMIN";
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [adminShows, setAdminShows] = useState<AdminShow[]>([]);
  const [accessCodes, setAccessCodes] = useState<AdminAccessCode[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [accessEvents, setAccessEvents] = useState<AdminAccessEvent[]>([]);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [reportPeriod, setReportPeriod] = useState<AdminReport["period"]>("month");
  const [reportLoading, setReportLoading] = useState(true);
  const [selectedUserHistory, setSelectedUserHistory] = useState<AdminUserHistory | null>(null);
  const [loadingUserHistory, setLoadingUserHistory] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [loadingShows, setLoadingShows] = useState(true);
  const [reservationSearch, setReservationSearch] = useState("");
  const [reservationPeriod, setReservationPeriod] = useState<"all" | "upcoming" | "past">("all");
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeExpiry, setAccessCodeExpiry] = useState("");
  const [revokingCodeId, setRevokingCodeId] = useState("");
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [posterPreview, setPosterPreview] = useState<{
    dataUrl: string;
    fileName: string;
    sizeLabel: string;
  } | null>(null);
  const [posterError, setPosterError] = useState("");

  const loadReservations = async () => {
    setLoadingReservations(true);
    setLoadError("");
    try {
      setReservations(await apiRequest<AdminReservation[]>("/admin/reservations"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar las reservas.");
    } finally {
      setLoadingReservations(false);
    }
  };

  const loadAdminShows = async () => {
    try {
      setAdminShows(await apiRequest<AdminShow[]>("/admin/shows"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar la cartelera administrativa.");
    } finally {
      setLoadingShows(false);
    }
  };

  const loadAccessCodes = async () => {
    try {
      setAccessCodes(await apiRequest<AdminAccessCode[]>("/admin/access-codes"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los códigos.");
    }
  };

  const loadUsers = async () => {
    if (!isSuperadmin) return;
    try {
      setUsers(await apiRequest<AdminUser[]>("/admin/users"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar las cuentas.");
    }
  };

  const loadAccessEvents = async () => {
    if (!isSuperadmin) return;
    try {
      setAccessEvents(await apiRequest<AdminAccessEvent[]>("/admin/access-events"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar la actividad de acceso.");
    }
  };

  const loadReport = async (period: AdminReport["period"] = reportPeriod) => {
    setReportLoading(true);
    try {
      const result = await apiRequest<AdminReport>(`/admin/reports?period=${period}`);
      setReport(result);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar el reporte.");
    } finally {
      setReportLoading(false);
    }
  };

  const loadUserHistory = async (userId: string) => {
    setLoadingUserHistory(true);
    try {
      setSelectedUserHistory(await apiRequest<AdminUserHistory>(
        `/admin/users/${encodeURIComponent(userId)}/history`,
      ));
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo cargar el historial de la cuenta.", "error");
    } finally {
      setLoadingUserHistory(false);
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    void loadReservations();
    void loadAdminShows();
    if (isSuperadmin) {
      void loadAccessCodes();
      void loadUsers();
      void loadAccessEvents();
    }
    void loadReport();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [isSuperadmin]);

  const filteredReservations = useMemo(() => {
    const query = reservationSearch.trim().toLocaleLowerCase("es");
    const now = Date.now();
    return reservations.filter((reservation) => {
      const date = new Date(reservation.performance.startsAt).getTime();
      const matchesPeriod = reservationPeriod === "all" ||
        (reservationPeriod === "upcoming" ? date >= now : date < now);
      const haystack = [
        reservation.customerName,
        reservation.customerEmail,
        reservation.confirmationCode,
        reservation.performance.show.title,
        ...reservation.seatCodes,
      ].join(" ").toLocaleLowerCase("es");
      return matchesPeriod && haystack.includes(query);
    });
  }, [reservationPeriod, reservationSearch, reservations]);

  const reservedAmount = reservations.reduce(
    (total, reservation) => total + reservation.totalAmount,
    0,
  );
  const activePerformances = adminShows.reduce(
    (total, show) => total + show.performances.filter((item) =>
      new Date(item.endsAt).getTime() > Date.now(),
    ).length,
    0,
  );
  const activeAccessCodes = accessCodes.filter((item) =>
    !item.usedAt && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now(),
  ).length;
  const registeredUsers = users.length;

  const downloadReservations = () => {
    const escapeCell = (value: string | number) => {
      const text = String(value);
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const rows = [
      ["Obra", "Función", "Sala", "Nombre", "Correo", "Butacas", "Total Bs", "Código"],
      ...filteredReservations.map((reservation) => [
        reservation.performance.show.title,
        formatPerformanceDate(reservation.performance.startsAt),
        reservation.performance.venue,
        reservation.customerName,
        reservation.customerEmail,
        reservation.seatCodes.join(" "),
        reservation.totalAmount,
        reservation.confirmationCode,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "reservaciones-teatro-ucb.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateShowStatus = async (show: AdminShow) => {
    setSubmitting(true);
    try {
      await apiRequest(`/admin/shows/${encodeURIComponent(show.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !show.active }),
      });
      notify(show.active
        ? `“${show.title}” se archivó de la cartelera pública.`
        : `“${show.title}” volvió a la cartelera pública.`);
      await loadAdminShows();
      onCatalogChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo actualizar la obra.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const revokeAccessCode = async (item: AdminAccessCode) => {
    setRevokingCodeId(item.id);
    try {
      await apiRequest(`/admin/access-codes/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      notify("El código de acceso fue revocado.");
      await loadAccessCodes();
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo revocar el código.", "error");
    } finally {
      setRevokingCodeId("");
    }
  };

  const createAdminCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setAccessCode("");
    try {
      const formData = new FormData(event.currentTarget);
      const result = await apiRequest<{ code: string; expiresAt: string }>("/admin/access-codes", {
        method: "POST",
        body: JSON.stringify({ expiresInDays: Number(formData.get("expiresInDays")) }),
      });
      setAccessCode(result.code);
      setAccessCodeExpiry(formatPerformanceDate(result.expiresAt));
      form.reset();
      await loadAccessCodes();
      notify("Código generado. Compártelo antes de cerrar este panel.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo generar el código.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const updateUserRole = async (user: AdminUser) => {
    const role = user.role === "ADMIN" ? "USER" : "ADMIN";
    setSubmitting(true);
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(user.id)}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      notify(role === "ADMIN"
        ? `Se otorgó el rol de administrador a CI ${user.ci}.`
        : `Se retiraron los permisos de administrador a CI ${user.ci}.`);
      await loadUsers();
      if (selectedUserHistory?.user.id === user.id) await loadUserHistory(user.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo actualizar el rol.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const clearPosterSelection = () => {
    setPosterPreview(null);
    setPosterError("");
    if (posterInputRef.current) posterInputRef.current.value = "";
  };

  const handlePosterChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      clearPosterSelection();
      return;
    }
    setPosterError("");
    try {
      const { dataUrl, sizeLabel } = await readValidatedJpegFile(file);
      setPosterPreview({ dataUrl, fileName: file.name, sizeLabel });
    } catch (error) {
      setPosterPreview(null);
      if (posterInputRef.current) posterInputRef.current.value = "";
      const message = error instanceof Error ? error.message : "No se pudo cargar la portada JPG.";
      setPosterError(message);
      notify(message, "error");
    }
  };

  const createShow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      const genre = genres.find(({ value }) => value === formData.get("genre"));
      if (!genre) throw new Error("Selecciona un género válido.");
      const result = await apiRequest<{ show: { title: string } }>("/admin/shows", {
        method: "POST",
        body: JSON.stringify({
          title: getFormValue(formData, "title"),
          synopsis: getFormValue(formData, "synopsis"),
          playwright: getFormValue(formData, "playwright"),
          genre: genre.apiValue,
          duration: Number(formData.get("duration")),
          ...(posterPreview ? { posterImage: posterPreview.dataUrl } : {}),
          startsAt: new Date(getFormValue(formData, "startsAt")).toISOString(),
          venue: getFormValue(formData, "venue"),
          standardPrice: Number(formData.get("standardPrice")),
          preferredPrice: Number(formData.get("preferredPrice")),
        }),
      });
      notify(`Se creó “${result.show.title}” y su primera función.`);
      form.reset();
      clearPosterSelection();
      onCatalogChanged();
      await loadAdminShows();
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo crear la obra.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const createPerformance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      const showId = getFormValue(formData, "showId");
      if (!showId) throw new Error("Selecciona una obra.");
      await apiRequest(`/admin/shows/${encodeURIComponent(showId)}/performances`, {
        method: "POST",
        body: JSON.stringify({
          startsAt: new Date(getFormValue(formData, "startsAt")).toISOString(),
          venue: getFormValue(formData, "venue"),
          standardPrice: Number(formData.get("standardPrice")),
          preferredPrice: Number(formData.get("preferredPrice")),
        }),
      });
      notify("La función fue creada con sus butacas disponibles.");
      form.reset();
      await loadAdminShows();
      onCatalogChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo crear la función.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      className="dialog admin-dialog"
      ref={dialogRef}
      aria-labelledby="admin-title"
      onCancel={onClose}
    >
      <div className="dialog__panel admin-panel">
        <button className="dialog__close" type="button" aria-label="Cerrar panel" onClick={onClose}>×</button>
        <p className="eyebrow"><span className="eyebrow__rule" />Gestión del teatro</p>
        <h2 id="admin-title">Panel de <em>administración.</em></h2>
        <p className="admin-panel__intro">Consulta la actividad de las cuentas, las reservas y el rendimiento de la cartelera.</p>

        <section className="admin-metrics" aria-label="Resumen de actividad">
          <article className="admin-metric">
            <span>Reservaciones</span>
            <strong>{reservations.length}</strong>
            <small>Registros en el sistema</small>
          </article>
          <article className="admin-metric">
            <span>Monto reservado</span>
            <strong>Bs {reservedAmount}</strong>
            <small>No equivale a pagos cobrados</small>
          </article>
          <article className="admin-metric">
            <span>Obras publicadas</span>
            <strong>{adminShows.filter((show) => show.active).length}</strong>
            <small>De {adminShows.length} en el archivo</small>
          </article>
          <article className="admin-metric">
            <span>Funciones vigentes</span>
            <strong>{activePerformances}</strong>
            <small>Se ocultan al terminar su duración</small>
          </article>
          {isSuperadmin && (
            <>
              <article className="admin-metric">
                <span>Invitaciones activas</span>
                <strong>{activeAccessCodes}</strong>
                <small>Disponibles para un registro</small>
              </article>
              <article className="admin-metric">
                <span>Cuentas registradas</span>
                <strong>{registeredUsers}</strong>
                <small>Usuarios y administradores</small>
              </article>
            </>
          )}
        </section>

        <section className="admin-section" aria-labelledby="admin-report-title">
          <div className="admin-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__rule" />Resumen</p>
              <h3 id="admin-report-title">Actividad e ingresos por reservas</h3>
            </div>
            <label className="admin-period-select">
              <span className="visually-hidden">Período del reporte</span>
              <select
                value={reportPeriod}
                onChange={(event) => {
                  const period = event.target.value as AdminReport["period"];
                  setReportPeriod(period);
                  void loadReport(period);
                }}
              >
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="year">Este año</option>
              </select>
            </label>
          </div>
          {reportLoading ? (
            <p className="admin-empty">Cargando reporte...</p>
          ) : report ? (
            <>
              <div className="admin-metrics">
                <article className="admin-metric">
                  <span>Reservas {periodLabels[report.period]}</span>
                  <strong>{report.reservationCount}</strong>
                </article>
                <article className="admin-metric">
                  <span>Importe asociado</span>
                  <strong>Bs {report.reservedAmount}</strong>
                </article>
                <article className="admin-metric">
                  <span>Inicios de sesión</span>
                  <strong>{report.loginCount}</strong>
                </article>
              </div>
              <p className="admin-report-note">
                Montos calculados desde las reservas creadas en el período; no representan pagos cobrados, ya que el sitio no procesa pagos en línea.
              </p>
              {report.byShow.length === 0 ? (
                <p className="admin-empty">No hay reservas en este período.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table admin-table--compact">
                    <thead><tr><th>Obra</th><th>Reservas</th><th>Importe asociado</th></tr></thead>
                    <tbody>
                      {report.byShow.map((item) => (
                        <tr key={item.id}>
                          <td>{item.title}</td>
                          <td>{item.reservationCount}</td>
                          <td>Bs {item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="admin-empty">No se pudo cargar el reporte.</p>
          )}
        </section>

        {isSuperadmin && (
        <section className="admin-section" aria-labelledby="admin-users-title">
          <div className="admin-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__rule" />Cuentas</p>
              <h3 id="admin-users-title">Usuarios, roles e historial</h3>
            </div>
            <button className="button button--outline" type="button" onClick={() => { void loadUsers(); void loadAccessEvents(); }}>
              Actualizar
            </button>
          </div>
          {users.length === 0 ? (
            <p className="admin-empty">No hay cuentas registradas.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Cuenta</th><th>Alta</th><th>Último acceso</th><th>Actividad</th><th>Historial</th></tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.displayName || `CI ${user.ci}`}</strong>
                        <span>CI {user.ci} · {user.role === "SUPERADMIN"
                          ? "Superadministrador"
                          : user.role === "ADMIN"
                            ? "Administrador"
                            : "Usuario"}</span>
                        {user.bio && <span>{user.bio}</span>}
                      </td>
                      <td>{formatPerformanceDate(user.createdAt)}</td>
                      <td>{user.lastAccessAt ? formatPerformanceDate(user.lastAccessAt) : "Sin actividad"}</td>
                      <td>{user.accessCount} accesos · {user.reservationCount} reservas</td>
                      <td>
                        {user.role !== "SUPERADMIN" && (
                          <button
                            className={`button ${user.role === "ADMIN" ? "button--outline" : "button--gold"}`}
                            type="button"
                            disabled={submitting}
                            onClick={() => void updateUserRole(user)}
                          >
                            {user.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}
                          </button>
                        )}
                        {" "}
                        <button
                          className="button button--outline"
                          type="button"
                          disabled={loadingUserHistory}
                          onClick={() => void loadUserHistory(user.id)}
                        >
                          Ver historial
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selectedUserHistory && (
            <section className="admin-user-history" aria-label={`Historial de CI ${selectedUserHistory.user.ci}`}>
              <div className="admin-section__heading">
                <h4>Historial de {selectedUserHistory.user.displayName || `CI ${selectedUserHistory.user.ci}`}</h4>
                <button className="button button--outline" type="button" onClick={() => setSelectedUserHistory(null)}>
                  Cerrar historial
                </button>
              </div>
              <h5>Reservas ({selectedUserHistory.reservations.length})</h5>
              {selectedUserHistory.reservations.length === 0 ? (
                <p className="admin-empty">No hay reservas asociadas a esta cuenta.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table admin-table--compact">
                    <thead><tr><th>Obra / función</th><th>Cliente</th><th>Butacas</th><th>Importe</th></tr></thead>
                    <tbody>
                      {selectedUserHistory.reservations.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.performance.show.title}</strong><span>{formatPerformanceDate(item.performance.startsAt)}</span></td>
                          <td>{item.customerName}<span>{item.customerEmail}</span></td>
                          <td>{item.seatCodes.join(", ")}</td>
                          <td>Bs {item.totalAmount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <h5>Inicios de sesión y registros</h5>
              <ul className="admin-access-list">
                {selectedUserHistory.accessEvents.map((event) => (
                  <li key={event.id}>
                    {event.type === "LOGIN" ? "Inicio de sesión" : "Cuenta creada"}
                    <time dateTime={event.createdAt}>{formatPerformanceDate(event.createdAt)}</time>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
        )}

        {isSuperadmin && (
        <section className="admin-section" aria-labelledby="admin-access-events-title">
          <div className="admin-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__rule" />Accesos</p>
              <h3 id="admin-access-events-title">Actividad reciente de cuentas</h3>
            </div>
          </div>
          {accessEvents.length === 0 ? (
            <p className="admin-empty">Todavía no hay accesos registrados.</p>
          ) : (
            <ul className="admin-access-list">
              {accessEvents.map((event) => (
                <li key={event.id}>
                  <span>
                    <strong>{event.user.displayName || `CI ${event.user.ci}`}</strong>
                    · {event.type === "LOGIN" ? "inició sesión" : "creó una cuenta"}
                  </span>
                  <time dateTime={event.createdAt}>{formatPerformanceDate(event.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
          <p className="admin-report-note">Se muestran accesos de cuentas registradas; las visitas anónimas al sitio no se identifican ni se rastrean.</p>
        </section>
        )}

        <section className="admin-section" aria-labelledby="admin-reservations-title">
          <div className="admin-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__rule" />Actividad</p>
              <h3 id="admin-reservations-title">Reservaciones</h3>
            </div>
            <button className="button button--outline" type="button" onClick={() => void loadReservations()} disabled={loadingReservations}>
              {loadingReservations ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
          <div className="admin-reservation-tools">
            <label>
              <span className="visually-hidden">Buscar en reservaciones</span>
              <input
                type="search"
                placeholder="Buscar por cliente, obra o código..."
                value={reservationSearch}
                onChange={(event) => setReservationSearch(event.target.value)}
              />
            </label>
            <label>
              <span className="visually-hidden">Filtrar reservaciones por fecha</span>
              <select
                value={reservationPeriod}
                onChange={(event) => setReservationPeriod(event.target.value as typeof reservationPeriod)}
              >
                <option value="all">Todas las funciones</option>
                <option value="upcoming">Próximas</option>
                <option value="past">Pasadas</option>
              </select>
            </label>
            <button
              className="button button--outline"
              type="button"
              onClick={downloadReservations}
              disabled={filteredReservations.length === 0}
            >
              Exportar CSV
            </button>
          </div>
          {loadError && <p className="form-feedback" role="alert">{loadError}</p>}
          {loadingReservations ? (
            <p className="admin-empty">Cargando reservaciones...</p>
          ) : reservations.length === 0 ? (
            <p className="admin-empty">Todavía no hay reservaciones.</p>
          ) : filteredReservations.length === 0 ? (
            <p className="admin-empty">No hay reservaciones que coincidan con la búsqueda.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Función</th>
                    <th>Cliente</th>
                    <th>Butacas</th>
                    <th>Total</th>
                    <th>Confirmación</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td>
                        <strong>{reservation.performance.show.title}</strong>
                        <span>{formatPerformanceDate(reservation.performance.startsAt)}</span>
                      </td>
                      <td>
                        <strong>{reservation.customerName}</strong>
                        <span>{reservation.customerEmail}</span>
                      </td>
                      <td>{reservation.seatCodes.join(", ")}</td>
                      <td>Bs {reservation.totalAmount}</td>
                      <td><code>{reservation.confirmationCode}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isSuperadmin && (
        <section className="admin-section" aria-labelledby="admin-access-title">
          <div className="admin-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__rule" />Permisos</p>
              <h3 id="admin-access-title">Invitar a otro administrador</h3>
            </div>
          </div>
          <form className="admin-form admin-form--inline" onSubmit={(event) => void createAdminCode(event)}>
            <label>
              Vigencia
              <select name="expiresInDays" defaultValue="7">
                <option value="1">1 día</option>
                <option value="7">7 días</option>
                <option value="30">30 días</option>
                <option value="90">90 días</option>
              </select>
            </label>
            <button className="button button--gold" type="submit" disabled={submitting}>
              Generar código de acceso
            </button>
          </form>
          {accessCode && (
            <div className="admin-code" role="status">
              <span>Compártelo de forma segura: se mostrará solo esta vez y vence {accessCodeExpiry}.</span>
              <code>{accessCode}</code>
              <button
                className="button button--outline admin-code__copy"
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(accessCode).then(
                    () => notify("Código copiado."),
                    () => notify("No se pudo copiar. Selecciona y copia el código manualmente.", "error"),
                  );
                }}
              >
                Copiar código
              </button>
            </div>
          )}
          {accessCodes.length > 0 && (
            <div className="admin-code-list">
              <h4>Códigos emitidos</h4>
              {accessCodes.map((item) => {
                const expired = new Date(item.expiresAt).getTime() <= Date.now();
                const status = item.usedAt
                  ? "Utilizado"
                  : item.revokedAt
                    ? "Revocado"
                    : expired
                      ? "Vencido"
                      : "Disponible";
                return (
                  <article className="admin-code-row" key={item.id}>
                    <div>
                      <strong>{status}</strong>
                      <span>Creado {formatPerformanceDate(item.createdAt)} · vence {formatPerformanceDate(item.expiresAt)}</span>
                      {item.usedBy && <span>Usado por CI {item.usedBy.ci}</span>}
                    </div>
                    {!item.usedAt && !item.revokedAt && !expired && (
                      <button
                        className="button button--outline"
                        type="button"
                        disabled={revokingCodeId === item.id}
                        onClick={() => void revokeAccessCode(item)}
                      >
                        {revokingCodeId === item.id ? "Revocando..." : "Revocar"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        )}

        <section className="admin-section" aria-labelledby="admin-shows-title">
          <div className="admin-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__rule" />Estado editorial</p>
              <h3 id="admin-shows-title">Obras y cartelera</h3>
            </div>
            <button className="button button--outline" type="button" onClick={() => void loadAdminShows()} disabled={loadingShows}>
              {loadingShows ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
          {loadingShows ? (
            <p className="admin-empty">Cargando obras...</p>
          ) : adminShows.length === 0 ? (
            <p className="admin-empty">Todavía no hay obras.</p>
          ) : (
            <div className="admin-show-list">
              {adminShows.map((show) => (
                <article className="admin-show-row" key={show.id}>
                  <div>
                    <strong>{show.title}</strong>
                    <span>{show.performances.filter((item) => new Date(item.endsAt).getTime() > Date.now()).length} funciones vigentes · {show.active ? "Publicada" : "Archivada"} · {show.posterUrl ? "Portada JPG" : "Afiche predeterminado"}</span>
                    {show.performances.length > 0 && (
                      <details className="admin-performance-details">
                        <summary>Ver funciones y vencimientos</summary>
                        <ul>
                          {show.performances.map((item) => {
                            const expired = new Date(item.endsAt).getTime() <= Date.now();
                            return (
                              <li key={item.id}>
                                <span>{formatPerformanceDate(item.startsAt)} · {item.venue}</span>
                                <time dateTime={item.endsAt}>
                                  {expired ? "Vencida" : `Vence ${formatPerformanceDate(item.endsAt)}`}
                                </time>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    )}
                  </div>
                  <button
                    className={`button ${show.active ? "button--outline" : "button--gold"}`}
                    type="button"
                    disabled={submitting}
                    onClick={() => void updateShowStatus(show)}
                  >
                    {show.active ? "Archivar" : "Publicar"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-section" aria-labelledby="admin-create-show-title">
          <div className="admin-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__rule" />Cartelera</p>
              <h3 id="admin-create-show-title">Agregar obra y primera función</h3>
            </div>
          </div>
          <form className="admin-form" onSubmit={(event) => void createShow(event)}>
            <label>
              Título de la obra
              <input name="title" minLength={2} maxLength={120} required />
            </label>
            <label>
              Dramaturgia
              <input name="playwright" minLength={2} maxLength={120} required />
            </label>
            <label className="admin-form__wide">
              Sinopsis
              <textarea name="synopsis" minLength={10} maxLength={2000} rows={3} required />
            </label>
            <div className="admin-form__wide admin-poster-field">
              <label>
                Portada de la obra (JPG, opcional)
                <input
                  ref={posterInputRef}
                  name="posterFile"
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  onChange={(event) => void handlePosterChange(event)}
                />
                <span className="admin-form__hint">
                  Solo formato JPG (.jpg / .jpeg) de hasta 3 MB. Se adapta completa a la cartelera sin recortarse.
                </span>
              </label>
              {posterError && (
                <p className="form-feedback" role="alert">{posterError}</p>
              )}
              {posterPreview && (
                <div className="admin-poster-preview">
                  <div className="admin-poster-preview__frame">
                    <img
                      className="show-card__poster-backdrop"
                      src={posterPreview.dataUrl}
                      alt=""
                      aria-hidden="true"
                    />
                    <img
                      className="show-card__poster-img"
                      src={posterPreview.dataUrl}
                      alt="Vista previa de portada en cartelera"
                    />
                  </div>
                  <div className="admin-poster-preview__meta">
                    <strong>{posterPreview.fileName}</strong>
                    <span>JPG · {posterPreview.sizeLabel} · Vista previa en cartelera (sin recorte)</span>
                    <button
                      className="button button--outline"
                      type="button"
                      onClick={clearPosterSelection}
                    >
                      Quitar portada
                    </button>
                  </div>
                </div>
              )}
            </div>
            <label>
              Género
              <select name="genre" required defaultValue="">
                <option value="" disabled>Seleccionar</option>
                {genres.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>
              Duración (minutos)
              <input name="duration" type="number" min={1} max={600} required />
            </label>
            <label>
              Fecha y hora
              <input name="startsAt" type="datetime-local" required />
              <span className="admin-form__hint">El vencimiento se calcula automáticamente según la duración de la obra.</span>
            </label>
            <label>
              Sala
              <input name="venue" minLength={2} maxLength={120} required />
            </label>
            <label>
              Precio estándar (Bs)
              <input name="standardPrice" type="number" min={1} max={100000} required />
            </label>
            <label>
              Precio preferencial (Bs)
              <input name="preferredPrice" type="number" min={1} max={100000} required />
            </label>
            <button className="button button--gold admin-form__wide" type="submit" disabled={submitting}>
              Crear obra y función
            </button>
          </form>
        </section>

        <section className="admin-section" aria-labelledby="admin-add-performance-title">
          <div className="admin-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__rule" />Programación</p>
              <h3 id="admin-add-performance-title">Agregar función</h3>
            </div>
          </div>
          {loadingShows ? (
            <p className="admin-empty">Cargando obras...</p>
          ) : adminShows.filter((show) => show.active).length === 0 ? (
            <p className="admin-empty">Crea una obra antes de programar una función.</p>
          ) : (
            <form className="admin-form" onSubmit={(event) => void createPerformance(event)}>
              <label className="admin-form__wide">
                Obra
                <select name="showId" required defaultValue="">
                  <option value="" disabled>Seleccionar obra</option>
                  {adminShows.filter((show) => show.active).map((show) => <option value={show.id} key={show.id}>{show.title}</option>)}
                </select>
              </label>
              <label>
                Fecha y hora
                <input name="startsAt" type="datetime-local" required />
                <span className="admin-form__hint">El vencimiento se calcula con la duración configurada para la obra.</span>
              </label>
              <label>
                Sala
                <input name="venue" minLength={2} maxLength={120} required />
              </label>
              <label>
                Precio estándar (Bs)
                <input name="standardPrice" type="number" min={1} max={100000} required />
              </label>
              <label>
                Precio preferencial (Bs)
                <input name="preferredPrice" type="number" min={1} max={100000} required />
              </label>
              <button className="button button--burgundy admin-form__wide" type="submit" disabled={submitting}>
                Guardar función
              </button>
            </form>
          )}
        </section>
      </div>
    </dialog>
  );
}
