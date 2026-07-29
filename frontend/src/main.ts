import { setUnauthorizedHandler } from "./api/http";
import { isAuthenticated } from "./auth/session";
import { renderDashboardView } from "./views/dashboard-view";
import { renderLoginView } from "./views/login-view";

const app = document.querySelector<HTMLDivElement>("#app")!;

function showLogin(): void {
  renderLoginView(app, showDashboard);
}

function showDashboard(): void {
  void renderDashboardView(app, showLogin);
}

function renderApp(): void {
  if (isAuthenticated()) {
    showDashboard();
  } else {
    showLogin();
  }
}

// Requisito "si recibe 401, limpiar token y redirigir a login": el
// interceptor en api/http.ts ya limpia el token; aqui solo se conecta la
// parte de "redirigir", volviendo a renderizar la pantalla de login.
setUnauthorizedHandler(showLogin);

renderApp();
