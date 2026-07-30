import { apiFetch } from "./http";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export function login(credentials: LoginRequest): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function logout(): Promise<void> {
  // El refresh_token va en una cookie HttpOnly: el navegador la manda solo
  // (credentials: "include", ver api/http.ts), no hace falta mandarla a mano.
  return apiFetch<void>("/auth/logout", { method: "POST" });
}
