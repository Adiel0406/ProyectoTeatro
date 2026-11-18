import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest, type Workshop } from "./api.ts";

export function WorkshopDialog({
  workshop,
  onClose,
  onApplied,
}: {
  workshop: Workshop;
  onClose: () => void;
  onApplied: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Campos de formulario
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("principiante");
  const [motivation, setMotivation] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Estados de proceso
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ applicationId: string } | null>(null);

  const remainingSeats = Math.max(0, workshop.capacity - workshop.enrolledSeats);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");

    if (!acceptTerms) {
      setFeedback("Debes confirmar tu compromiso de asistencia para completar la inscripción.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest<{ applicationId: string; message: string }>(
        "/workshop-applications",
        {
          method: "POST",
          body: JSON.stringify({
            workshopId: workshop.id,
            name: name.trim(),
            email: email.trim(),
          }),
        },
      );

      setSuccessData({ applicationId: response.applicationId });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo enviar la postulación.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishSuccess = () => {
    onApplied(`¡Inscripción confirmada para “${workshop.title}”!`);
  };

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      aria-labelledby="workshop-dialog-title"
      onCancel={onClose}
    >
      <div className="dialog__panel workshop-modal-panel">
        <button
          className="dialog__close"
          type="button"
          aria-label="Cerrar inscripción a convocatoria"
          onClick={onClose}
        >
          ×
        </button>

        {/* ====================================================
            VISTA DE ÉXITO / COMPROBANTE DE POSTULACIÓN
           ==================================================== */}
        {successData ? (
          <div className="workshop-success-view">
            <div className="workshop-success-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="workshop-success-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <p className="eyebrow"><span className="eyebrow__rule" />Postulación Exitosa</p>
            <h2 className="workshop-success-title">
              ¡Bienvenido al <em>elenco!</em>
            </h2>
            <p className="workshop-success-subtitle">
              Tu solicitud para la convocatoria del taller ha sido registrada correctamente.
            </p>

            <div className="workshop-receipt-card">
              <div className="workshop-receipt-row">
                <span className="workshop-receipt-label">Taller seleccionado:</span>
                <strong className="workshop-receipt-value">{workshop.title}</strong>
              </div>
              <div className="workshop-receipt-row">
                <span className="workshop-receipt-label">Postulante:</span>
                <span className="workshop-receipt-value">{name}</span>
              </div>
              <div className="workshop-receipt-row">
                <span className="workshop-receipt-label">Correo registrado:</span>
                <span className="workshop-receipt-value">{email}</span>
              </div>
              {phone && (
                <div className="workshop-receipt-row">
                  <span className="workshop-receipt-label">Teléfono / WhatsApp:</span>
                  <span className="workshop-receipt-value">{phone}</span>
                </div>
              )}
              <div className="workshop-receipt-row">
                <span className="workshop-receipt-label">Horario y lugar:</span>
                <span className="workshop-receipt-value">{workshop.schedule} · Sala Teatro UCB</span>
              </div>
              <div className="workshop-receipt-row">
                <span className="workshop-receipt-label">Docente:</span>
                <span className="workshop-receipt-value">{workshop.teacher}</span>
              </div>
            </div>

            <div className="workshop-success-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-notice-icon" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Hemos guardado tu plaza provisional. La coordinación se comunicará contigo vía correo o WhatsApp antes del inicio de ensayos.</span>
            </div>

            <button
              type="button"
              className="button button--gold workshop-success-finish-btn"
              onClick={handleFinishSuccess}
            >
              Completado · Volver a la Cartelera
            </button>
          </div>
        ) : (
          /* ====================================================
              FORMULARIO DE POSTULACIÓN A LA CONVOCATORIA
             ==================================================== */
          <div className="workshop-apply-view">
            {/* Encabezado y resumen del taller */}
            <div className="workshop-header">
              <div className="workshop-header-meta">
                <p className="eyebrow"><span className="eyebrow__rule" />Convocatoria Abierta · Teatro UCB</p>
                <div className={`workshop-seats-chip ${remainingSeats <= 5 ? "workshop-seats-chip--warning" : ""}`}>
                  <span className="workshop-seats-dot" />
                  {remainingSeats > 0 ? `${remainingSeats} cupos disponibles` : "Cupos agotados"}
                </div>
              </div>

              <h2 id="workshop-dialog-title" className="workshop-dialog-title">
                Postulación al <em>Taller</em>
              </h2>
              <p className="workshop-dialog-name">{workshop.title}</p>
            </div>

            {/* Ficha técnica compacta */}
            <div className="workshop-specs-grid">
              <div className="workshop-spec-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-spec-icon" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <div className="workshop-spec-info">
                  <span className="workshop-spec-title">Docente a cargo</span>
                  <strong className="workshop-spec-detail">{workshop.teacher}</strong>
                </div>
              </div>

              <div className="workshop-spec-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-spec-icon" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div className="workshop-spec-info">
                  <span className="workshop-spec-title">Horario de ensayos</span>
                  <strong className="workshop-spec-detail">{workshop.schedule}</strong>
                </div>
              </div>

              <div className="workshop-spec-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-spec-icon" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div className="workshop-spec-info">
                  <span className="workshop-spec-title">Sede</span>
                  <strong className="workshop-spec-detail">Sala de Teatro · UCB</strong>
                </div>
              </div>
            </div>

            {workshop.description && (
              <p className="workshop-desc-highlight">
                {workshop.description}
              </p>
            )}

            {/* Formulario de Registro */}
            <form className="workshop-form-pro" onSubmit={(event) => void submitApplication(event)}>
              <div className="workshop-form-section-title">
                <span>1. Datos del postulante</span>
              </div>

              <div className="workshop-form-row">
                <div className="workshop-field">
                  <label htmlFor="ws-name" className="workshop-label">
                    Nombre y Apellidos completos <span className="field-required">*</span>
                  </label>
                  <div className="workshop-input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-input-icon" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      id="ws-name"
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      placeholder="Ej. Valeria Gómez Salazar"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="workshop-input"
                    />
                  </div>
                </div>

                <div className="workshop-field">
                  <label htmlFor="ws-email" className="workshop-label">
                    Correo electrónico institucional o personal <span className="field-required">*</span>
                  </label>
                  <div className="workshop-input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-input-icon" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      id="ws-email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="nombre@ejemplo.com"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="workshop-input"
                    />
                  </div>
                </div>
              </div>

              <div className="workshop-form-row">
                <div className="workshop-field">
                  <label htmlFor="ws-phone" className="workshop-label">
                    Teléfono / WhatsApp de contacto <span className="field-optional">(recomendado)</span>
                  </label>
                  <div className="workshop-input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-input-icon" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    <input
                      id="ws-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="Ej. +591 70000000"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="workshop-input"
                    />
                  </div>
                </div>

                <div className="workshop-field">
                  <label htmlFor="ws-experience" className="workshop-label">
                    Experiencia teatral previa
                  </label>
                  <div className="workshop-input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-input-icon" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <select
                      id="ws-experience"
                      value={experienceLevel}
                      onChange={(event) => setExperienceLevel(event.target.value)}
                      className="workshop-input workshop-select"
                    >
                      <option value="principiante">Iniciación (Sin experiencia previa)</option>
                      <option value="intermedio">Intermedio (Talleres o cursos escolares/universitarios)</option>
                      <option value="avanzado">Avanzado (Elenco o producciones activas)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="workshop-form-section-title">
                <span>2. Carta de motivación y compromiso</span>
              </div>

              <div className="workshop-field">
                <label htmlFor="ws-motivation" className="workshop-label">
                  ¿Por qué deseas integrarte a este taller? <span className="field-optional">(opcional)</span>
                </label>
                <textarea
                  id="ws-motivation"
                  rows={2}
                  maxLength={500}
                  placeholder="Cuéntanos brevemente qué te inspira o qué deseas aprender en este ciclo..."
                  value={motivation}
                  onChange={(event) => setMotivation(event.target.value)}
                  className="workshop-input workshop-textarea"
                />
              </div>

              {/* Casilla de compromiso */}
              <label className="workshop-terms-checkbox">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  required
                />
                <span className="workshop-terms-text">
                  Confirmo mi disponibilidad para el horario establecido ({workshop.schedule}) y me comprometo a participar activamente en las sesiones del taller.
                </span>
              </label>

              {/* Mensaje de error/feedback si ocurre */}
              {feedback && (
                <div className="workshop-error-banner" role="alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="workshop-error-icon" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{feedback}</span>
                </div>
              )}

              {/* Botón de Enviar Postulación */}
              <div className="workshop-form-actions">
                <button
                  type="button"
                  className="button button--account"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  className="button button--gold workshop-submit-btn"
                  type="submit"
                  disabled={submitting || remainingSeats === 0}
                >
                  {submitting ? (
                    <span className="workshop-btn-loading">
                      <svg className="auth-spinner" viewBox="0 0 24 24" fill="none">
                        <circle className="auth-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="auth-spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registrando postulación...
                    </span>
                  ) : (
                    <>
                      Confirmar postulación al taller <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </dialog>
  );
}
