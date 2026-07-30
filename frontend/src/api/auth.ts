import { getRefreshToken } from "../auth/session";
import { apiFetch } from "./http";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
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
  // Se manda el refresh_token para que el backend tambien lo revoque: sin
  // esto, seguiria vigente y podria usarse para pedir access tokens nuevos
  // despues del logout.
  return apiFetch<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: getRefreshToken() }),
  });
}
