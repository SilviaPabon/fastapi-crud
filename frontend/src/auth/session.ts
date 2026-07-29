/**
 * Manejo de la sesion en el frontend.
 *
 * El access_token se guarda en sessionStorage: sobrevive a un refresh de la
 * pagina (a diferencia de una variable JS en memoria) pero desaparece al
 * cerrar la pestana/navegador (a diferencia de localStorage). Es un punto
 * intermedio razonable para este caso.
 *
 * Nota de seguridad: cualquier dato en sessionStorage/localStorage es
 * legible por JS, por lo que un XSS podria robar el token igual que si
 * estuviera en memoria pero accesible globalmente. La proteccion real
 * contra eso es evitar XSS (sanitizar inputs, CSP, etc.), no el lugar de
 * almacenamiento.
 */

const TOKEN_KEY = "access_token";

export type Role = "ADMIN" | "USER";

interface TokenPayload {
  sub: string;
  role: Role;
  exp: number;
  jti: string;
}

export function saveToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
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
