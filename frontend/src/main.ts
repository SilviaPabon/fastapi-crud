import { setUnauthorizedHandler, tryRestoreSession } from "./api/http";
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

// El access_token vive solo en memoria (nunca en storage), asi que se
// pierde en cada recarga de pagina. Al arrancar la app se intenta reponerlo
// en silencio con la cookie HttpOnly del refresh token (tryRestoreSession);
// si funciona, el usuario sigue logueado sin volver a escribir credenciales.
async function renderApp(): Promise<void> {
  const restored = await tryRestoreSession();
  if (restored) {
    showProductList();
  } else {
    showLogin();
  }
}

// Requisito "si recibe 401, limpiar token y redirigir a login": el
// interceptor en api/http.ts ya limpia el token; aqui solo se conecta la
// parte de "redirigir", volviendo a renderizar la pantalla de login.
setUnauthorizedHandler(showLogin);

await renderApp();
