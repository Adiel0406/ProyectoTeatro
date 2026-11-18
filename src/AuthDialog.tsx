import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest, type AuthUser } from "./api.ts";

export function AuthDialog({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [ci, setCi] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [showAccessCodeField, setShowAccessCodeField] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const handleTabChange = (registering: boolean) => {
    setIsRegistering(registering);
    setFeedback("");
    setPassword("");
    setAccessCode("");
    setShowAccessCodeField(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");

    // Validación previa amigable
    const cleanedCi = ci.trim();
    if (!/^\d{5,15}$/.test(cleanedCi)) {
      setFeedback("La cédula de identidad debe contener entre 5 y 15 dígitos numéricos.");
      setSubmitting(false);
      return;
    }

    if (isRegistering && password.length < 8) {
      setFeedback("La contraseña debe tener un mínimo de 8 caracteres.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await apiRequest<{ user: AuthUser }>(
        isRegistering ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            ci: cleanedCi,
            password,
            ...(isRegistering && accessCode.trim()
              ? { accessCode: accessCode.trim() }
              : {}),
          }),
        },
      );
      onAuthenticated(result.user);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo completar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPasswordValidLength = password.length >= 8;

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      aria-labelledby="auth-title"
      onCancel={onClose}
    >
      <div className="dialog__panel auth-modal-panel">
        <button
          className="dialog__close"
          type="button"
          aria-label="Cerrar ventana de autenticación"
          onClick={onClose}
        >
          ×
        </button>

        {/* Encabezado con identidad de Teatro UCB */}
        <div className="auth-header">
          <div className="auth-brand-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="auth-badge-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M9.5 15.5c.83.67 1.67 1 2.5 1s1.67-.33 2.5-1" />
            </svg>
          </div>
          <p className="eyebrow"><span className="eyebrow__rule" />Portal Cultural</p>
          <h2 id="auth-title" className="auth-title">
            Teatro <em>UCB</em>
          </h2>
          <p className="auth-subtitle">
            {isRegistering
              ? "Crea tu cuenta institucional o personal para acceder a funciones y talleres"
              : "Ingresa a tu cuenta para gestionar reservas y convocatorias"}
          </p>
        </div>

        {/* Selector de pestañas elegante */}
        <div className="auth-tabs" role="tablist" aria-label="Opciones de autenticación">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegistering}
            className={`auth-tab ${!isRegistering ? "auth-tab--active" : ""}`}
            onClick={() => handleTabChange(false)}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegistering}
            className={`auth-tab ${isRegistering ? "auth-tab--active" : ""}`}
            onClick={() => handleTabChange(true)}
          >
            Crear cuenta
          </button>
        </div>

        {/* Formulario */}
        <form className="auth-form-pro" onSubmit={(event) => void submit(event)}>
          {/* Campo Cédula de Identidad */}
          <div className="auth-field-group">
            <label htmlFor="auth-ci" className="auth-field-label">
              <span>Cédula de Identidad (CI)</span>
              <span className="auth-field-hint">Solo dígitos numéricos</span>
            </label>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="2" />
                <path d="M15 8h2M15 12h2M7 16h10" />
              </svg>
              <input
                id="auth-ci"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                minLength={5}
                maxLength={15}
                pattern="[0-9]{5,15}"
                placeholder="Ej. 8492012"
                required
                value={ci}
                onChange={(event) => setCi(event.target.value.replace(/\D/g, ""))}
                className="auth-input"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="auth-field-group">
            <div className="auth-field-header">
              <label htmlFor="auth-password" className="auth-field-label">
                <span>Contraseña</span>
              </label>
              {isRegistering && (
                <span className={`auth-pw-status ${isPasswordValidLength ? "auth-pw-status--valid" : ""}`}>
                  {isPasswordValidLength ? "✓ Longitud válida" : "Mín. 8 caracteres"}
                </span>
              )}
            </div>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                minLength={isRegistering ? 8 : undefined}
                maxLength={128}
                placeholder="Ingresa tu contraseña"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="auth-input"
              />
              <button
                type="button"
                className="auth-toggle-pw"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="auth-pw-icon" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="auth-pw-icon" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Opcional: Código de Administrador para registro */}
          {isRegistering && (
            <div className="auth-admin-toggle-wrapper">
              {!showAccessCodeField ? (
                <button
                  type="button"
                  className="auth-admin-reveal-button"
                  onClick={() => setShowAccessCodeField(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="auth-inline-icon" aria-hidden="true">
                    <path d="M21 2l-2 2m-1.5 6.5l3-3a3 3 0 00-4.24-4.24l-3 3M11 13a5 5 0 100-10 5 5 0 000 10z" />
                  </svg>
                  ¿Tienes un código de invitación de administrador?
                </button>
              ) : (
                <div className="auth-field-group auth-admin-field-reveal">
                  <label htmlFor="auth-access-code" className="auth-field-label">
                    <span>Código de acceso especial</span>
                    <span className="auth-field-hint">Solo para administradores invitados</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="8" cy="15" r="4" />
                      <path d="M10.85 12.15L19 4M18 5l2 2M15 8l2 2" />
                    </svg>
                    <input
                      id="auth-access-code"
                      type="text"
                      autoComplete="off"
                      maxLength={64}
                      placeholder="Pega el código de 32 o 64 caracteres"
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alerta de Feedback / Error */}
          {feedback && (
            <div className="auth-error-banner" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="auth-error-icon" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{feedback}</span>
            </div>
          )}

          {/* Botón de Envío */}
          <button
            className="button button--gold auth-submit-btn"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <span className="auth-btn-loading">
                <svg className="auth-spinner" viewBox="0 0 24 24" fill="none">
                  <circle className="auth-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="auth-spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verificando credenciales...
              </span>
            ) : isRegistering ? (
              "Crear cuenta en Teatro UCB"
            ) : (
              "Ingresar al sistema"
            )}
          </button>
        </form>

        {/* Pie de modal: Conmutador y seguridad */}
        <div className="auth-footer">
          <p className="auth-switch-text">
            {isRegistering ? "¿Ya estás registrado?" : "¿Eres nuevo en Teatro UCB?"}
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => handleTabChange(!isRegistering)}
            >
              {isRegistering ? "Inicia sesión aquí" : "Crea tu cuenta gratis"}
            </button>
          </p>
          <div className="auth-security-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="auth-sec-icon" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Sesión protegida y credenciales cifradas con scrypt</span>
          </div>
        </div>
      </div>
    </dialog>
  );
}
