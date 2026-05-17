/**
 * API response types — shared between frontend and backend.
 */

/** Standard API error response */
export interface ApiError {
  error: string;
  message: string;
  stack?: string;
}

/** Standard paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

/** Health check response */
export interface HealthResponse {
  ok: boolean;
  service: string;
  timestamp: string;
  environment?: string;
  redis?: { status: string; ping: string };
  uptime?: number;
}

/** API response wrapper */
export type ApiResponse<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: ApiError;
};
