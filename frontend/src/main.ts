import { setUnauthorizedHandler } from "./api/http";
import { isAuthenticated } from "./auth/session";
import { renderLoginView } from "./views/login-view";
import { renderProductDetailView } from "./views/product-detail-view";
import { renderProductListView } from "./views/product-list-view";

const app = document.querySelector<HTMLDivElement>("#app")!;

function showLogin(): void {
  renderLoginView(app, showProductList);
}

function showProductList(): void {
  void renderProductListView(app, { onLoggedOut: showLogin, onSelectProduct: showProductDetail });
}

function showProductDetail(productId: number): void {
  void renderProductDetailView(app, productId, showProductList);
}

function renderApp(): void {
  if (isAuthenticated()) {
    showProductList();
  } else {
    showLogin();
  }
}

// Requisito "si recibe 401, limpiar token y redirigir a login": el
// interceptor en api/http.ts ya limpia el token; aqui solo se conecta la
// parte de "redirigir", volviendo a renderizar la pantalla de login.
setUnauthorizedHandler(showLogin);

renderApp();
