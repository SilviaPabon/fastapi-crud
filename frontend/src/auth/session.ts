/**
 * Manejo de la sesion en el frontend.
 *
 * El refresh_token vive en una cookie HttpOnly puesta por el backend: JS no
 * puede leerla ni escribirla (por diseno, ver app/auth/router.py), asi que
 * ni siquiera aparece en este archivo. El access_token se guarda solo en
 * una variable de modulo (memoria): nunca toca sessionStorage/localStorage,
 * asi que un XSS que ejecute JS arbitrario no puede leerlo escaneando el
 * storage. El costo es que se pierde al recargar la pagina; por eso
 * api/http.ts pide uno nuevo automaticamente al arrancar la app usando la
 * cookie de refresh (ver tryRestoreSession en main.ts).
 */

let accessToken: string | null = null;

export type Role = "ADMIN" | "USER";

interface TokenPayload {
  sub: string;
  role: Role;
  exp: number;
  jti: string;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getToken(): string | null {
  return accessToken;
}

export function clearToken(): void {
  accessToken = null;
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Decodifica el payload del JWT en el navegador SIN verificar la firma
 * (el navegador no tiene el SECRET_KEY, ni deberia tenerlo). Sirve
 * unicamente para decisiones de UI (ej. mostrar/ocultar el boton de
 * "crear" si role !== ADMIN). La autorizacion real siempre la aplica
 * el backend en cada request.
 */
export function getTokenPayload(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;
  try {
    const base64Payload = token.split(".")[1];
    const json = atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export function getRole(): Role | null {
  return getTokenPayload()?.role ?? null;
}
