export type Genre = "drama" | "comedia" | "musical";

export interface PerformanceSummary {
  id: string;
  venue: string;
  startsAt: string;
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
  role: "USER" | "ADMIN";
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
  show: { title: string };
  seats: PerformanceSeat[];
}

interface ApiErrorBody {
  error?: { message?: string };
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
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const result = (await response.json()) as T & ApiErrorBody;

  if (!response.ok) {
    throw new ApiError(
      result.error?.message ?? "No se pudo completar la solicitud.",
      response.status,
    );
  }

  return result;
}
