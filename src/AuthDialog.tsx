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
  const [accessCode, setAccessCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    try {
      const result = await apiRequest<{ user: AuthUser }>(
        isRegistering ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            ci,
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

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      aria-labelledby="auth-title"
      onCancel={onClose}
    >
      <div className="dialog__panel auth-panel">
        <button className="dialog__close" type="button" aria-label="Cerrar" onClick={onClose}>×</button>
        <p className="eyebrow"><span className="eyebrow__rule" />Teatro UCB</p>
        <h2 id="auth-title">
          {isRegistering ? <>Crea tu <em>cuenta.</em></> : <>Qué bueno <em>verte.</em></>}
        </h2>
        <p className="auth-panel__intro">
          {isRegistering
            ? "Regístrate con tu cédula. Para obtener permisos de administrador necesitas un código de invitación."
            : "Ingresa con tu cédula de identidad y contraseña."}
        </p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            Cédula de identidad
            <input
              type="text"
              inputMode="numeric"
              autoComplete="username"
              minLength={5}
              maxLength={15}
              pattern="[0-9]{5,15}"
              placeholder="Solo números"
              required
              value={ci}
              onChange={(event) => setCi(event.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={isRegistering ? 8 : undefined}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {isRegistering && <span className="auth-form__hint">Mínimo 8 caracteres.</span>}
          </label>
          {isRegistering && (
            <label>
              Código de acceso <span className="auth-form__optional">(opcional)</span>
              <input
                type="text"
                autoComplete="off"
                maxLength={64}
                placeholder="Solo si te invitaron como administrador"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
              />
            </label>
          )}
          {feedback && <p className="form-feedback" role="alert">{feedback}</p>}
          <button className="button button--gold auth-form__submit" type="submit" disabled={submitting}>
            {submitting
              ? "Un momento..."
              : isRegistering
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>
        </form>
        <p className="auth-panel__switch">
          {isRegistering ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"}
          <button
            type="button"
            onClick={() => {
              setIsRegistering((registering) => !registering);
              setFeedback("");
              setPassword("");
              setAccessCode("");
            }}
          >
            {isRegistering ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>
      </div>
    </dialog>
  );
}
