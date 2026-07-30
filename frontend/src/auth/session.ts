/**
 * Manejo de la sesion en el frontend.
 *
 * access_token y refresh_token se guardan en sessionStorage: sobreviven a un
 * refresh de la pagina (a diferencia de una variable JS en memoria) pero
 * desaparecen al cerrar la pestana/navegador (a diferencia de localStorage).
 * Es un punto intermedio razonable para este caso.
 *
 * Nota de seguridad: cualquier dato en sessionStorage/localStorage es
 * legible por JS, por lo que un XSS podria robar los tokens igual que si
 * estuvieran en memoria pero accesibles globalmente. La proteccion real
 * contra eso es evitar XSS (sanitizar inputs, CSP, etc.), no el lugar de
 * almacenamiento. Migrar el refresh_token a una cookie HttpOnly queda
 * pendiente para la fase de seguridad.
 */

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export type Role = "ADMIN" | "USER";

interface TokenPayload {
  sub: string;
  role: Role;
  exp: number;
  jti: string;
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
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
