/**
 * Wrapper central sobre fetch. TODAS las llamadas a la API deben pasar por
 * apiFetch (nunca usar fetch directo en otro archivo): es el unico lugar
 * donde se inyecta el token y se reacciona a un 401. fetch no trae
 * "interceptores" incorporados como otras librerias, asi que este wrapper
 * cumple ese mismo rol: es el punto unico por el que pasa cada request.
 */

import { clearTokens, getRefreshToken, getToken, saveTokens } from "../auth/session";

const BASE_URL = "http://localhost:8000";

// Endpoints de auth que no deben disparar el flujo de refresh ante un 401:
// /login porque un 401 ahi es "credenciales invalidas" (no "token vencido"),
// y /refresh porque si el propio refresh token es invalido no tiene sentido
// intentar renovarlo con si mismo (evita un loop).
const AUTH_ENDPOINTS_WITHOUT_REFRESH = new Set(["/auth/login", "/auth/refresh"]);

/**
 * Callback que el router (main.ts) registra para saber como volver a la
 * pantalla de login. Se inyecta asi (en vez de importar el router aqui)
 * para evitar una dependencia circular entre http.ts y main.ts.
 */
let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
}

interface ErrorBody {
  // Los errores simples (401/403/404/409) traen detail como string; los
  // 422 de validacion de FastAPI traen detail como lista, uno por campo.
  detail?: string | ValidationErrorItem[];
}

function extractDetail(body: ErrorBody | null): string {
  const detail = body?.detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((item) => `${String(item.loc.at(-1))}: ${item.msg}`).join("; ");
  }
  return "Error inesperado";
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Requests concurrentes que reciben 401 al mismo tiempo (ej. dos fetch en
// paralelo cuando expira el access token) no deben disparar N llamadas a
// /auth/refresh: todas esperan esta misma promesa compartida, y solo la
// primera realmente la ejecuta.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as RefreshResponse;
  saveTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

function getOrCreateRefresh(): Promise<string | null> {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function buildRequest(options: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...options, headers };
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response = await fetch(`${BASE_URL}${path}`, buildRequest(options, getToken()));

  // Renovacion transparente: si el access token esta vencido (401) y el
  // endpoint no es /auth/login ni /auth/refresh, se intenta renovarlo una
  // vez con el refresh token guardado y se reintenta la request original.
  if (response.status === 401 && !AUTH_ENDPOINTS_WITHOUT_REFRESH.has(path)) {
    const newAccessToken = await getOrCreateRefresh();
    if (newAccessToken) {
      response = await fetch(`${BASE_URL}${path}`, buildRequest(options, newAccessToken));
    }
  }

  // Si sigue en 401 (no habia refresh token, tambien expiro/fue revocado,
  // o el reintento volvio a fallar), se limpia la sesion y se redirige a
  // login, igual que antes.
  if (response.status === 401) {
    clearTokens();
    onUnauthorized();
    throw new ApiError(401, "No autenticado");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, extractDetail(body as ErrorBody | null));
  }

  return body as T;
}
