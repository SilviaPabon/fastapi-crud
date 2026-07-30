import { ApiError } from "../api/http";
import { login } from "../api/auth";
import { setAccessToken } from "../auth/session";

export function renderLoginView(app: HTMLElement, onLoginSuccess: () => void): void {
  app.innerHTML = `
    <div class="login-page">
      <form id="login-form" class="login-card">
        <h1>Iniciar sesion</h1>
        <label for="username">Usuario</label>
        <input id="username" name="username" type="text" autocomplete="username" required />

        <label for="password">Contrasena</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />

        <button type="submit">Entrar</button>
        <p id="login-error" class="error" hidden></p>
      </form>
    </div>
  `;

  const form = app.querySelector<HTMLFormElement>("#login-form")!;
  const usernameInput = app.querySelector<HTMLInputElement>("#username")!;
  const passwordInput = app.querySelector<HTMLInputElement>("#password")!;
  const errorEl = app.querySelector<HTMLParagraphElement>("#login-error")!;
  const submitButton = form.querySelector<HTMLButtonElement>("button[type=submit]")!;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    submitButton.disabled = true;

    try {
      const token = await login({ username: usernameInput.value, password: passwordInput.value });
      setAccessToken(token.access_token);
      onLoginSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "No se pudo conectar con el servidor";
      errorEl.textContent = message;
      errorEl.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });
}
