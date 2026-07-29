/**
 * Wrapper central sobre fetch. TODAS las llamadas a la API deben pasar por
 * apiFetch (nunca usar fetch directo en otro archivo): es el unico lugar
 * donde se inyecta el token y se reacciona a un 401. fetch no trae
 * "interceptores" incorporados como otras librerias, asi que este wrapper
 * cumple ese mismo rol: es el punto unico por el que pasa cada request.
 */

import { clearToken, getToken } from "../auth/session";

const BASE_URL = "http://localhost:8000";

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

interface ErrorBody {
  detail?: string;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  // 1) Requisito "agregar el token en cada request": si hay token guardado,
  //    se inyecta el header Authorization: Bearer antes de salir al backend.
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // 2) Requisito "si recibe 401, limpiar el token y redirigir a login":
  //    pase lo que pase (token ausente, invalido, expirado o revocado), el
  //    backend siempre responde 401 y aqui se reacciona igual en todos los casos.
  if (response.status === 401) {
    clearToken();
    onUnauthorized();
    throw new ApiError(401, "No autenticado");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = (body as ErrorBody | null)?.detail ?? "Error inesperado";
    throw new ApiError(response.status, detail);
  }

  return body as T;
}
