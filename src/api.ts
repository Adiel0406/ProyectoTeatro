export type Genre = "drama" | "comedia" | "musical";

export interface PerformanceSummary {
  id: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  availableSeats: number;
}

export interface Show {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  playwright: string;
  genre: Genre;
  duration: number;
  posterStyle: string;
  posterUrl: string | null;
  performances: PerformanceSummary[];
}

export interface Workshop {
  id: string;
  title: string;
  description: string;
  schedule: string;
  teacher: string;
  capacity: number;
  enrolledSeats: number;
}

export interface AuthUser {
  id: string;
  ci: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  displayName: string | null;
}

export interface UserProfile extends AuthUser {
  bio: string | null;
  favoriteQuote: string | null;
  createdAt: string;
}

export interface AccountReservation {
  id: string;
  confirmationCode: string;
  totalAmount: number;
  createdAt: string;
  seatCodes: string[];
  performance: {
    id: string;
    startsAt: string;
    endsAt: string;
    show: { title: string };
    review: PerformanceReview | null;
  };
}

export interface PerformanceReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface UserAccessEvent {
  id: string;
  type: "LOGIN" | "REGISTER";
  createdAt: string;
}

export interface PerformanceSeat {
  id: string;
  code: string;
  category: string;
  price: number;
  status: "AVAILABLE" | "RESERVED";
}

export interface PerformanceDetail {
  id: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  show: { title: string };
  seats: PerformanceSeat[];
}

interface ApiErrorBody {
  error?: {
    message?: string;
    details?: Array<{ path: string; message: string }>;
  };
}

function isValidationDetail(value: unknown): value is { path: string; message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    typeof value.path === "string" &&
    "message" in value &&
    typeof value.message === "string"
  );
}

function getApiErrorBody(value: unknown): ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return {};
  }
  const error = value.error;
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const message = "message" in error && typeof error.message === "string"
    ? error.message
    : undefined;
  const details = "details" in error && Array.isArray(error.details)
    ? error.details.filter(isValidationDetail)
    : undefined;
  return { error: { message, details } };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
        0,
      );
    }
    throw error;
  }

  const responseText = await response.text();
  let result: unknown;
  try {
    result = JSON.parse(responseText);
  } catch {
    const message = response.ok
      ? "El servidor devolvió una respuesta inválida."
      : `El servidor devolvió un error HTTP ${response.status} sin detalles.`;
    throw new ApiError(message, response.status);
  }

  if (!response.ok) {
    const error = getApiErrorBody(result).error;
    const validationDetails = error?.details
      ?.map(({ path, message }) => `${path || "solicitud"}: ${message}`)
      .join("; ");
    throw new ApiError(
      [
        error?.message ?? "No se pudo completar la solicitud.",
        validationDetails,
      ].filter(Boolean).join(" "),
      response.status,
    );
  }

  return result as T;
}
