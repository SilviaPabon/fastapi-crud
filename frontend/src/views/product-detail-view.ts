import { ApiError } from "../api/http";
import { adjustStock, getProduct, type Product } from "../api/products";
import { getTokenPayload } from "../auth/session";

export async function renderProductDetailView(app: HTMLElement, productId: number, onBack: () => void): Promise<void> {
  const isAdmin = getTokenPayload()?.role === "ADMIN";

  app.innerHTML = `
    <div class="detail-page">
      <button id="back-btn">&larr; Volver</button>
      <p id="detail-status" class="hint">Cargando producto...</p>
      <p id="detail-error" class="error" hidden></p>
      <div id="detail-content" hidden></div>
    </div>
  `;

  const statusEl = app.querySelector<HTMLParagraphElement>("#detail-status")!;
  const errorEl = app.querySelector<HTMLParagraphElement>("#detail-error")!;
  const contentEl = app.querySelector<HTMLDivElement>("#detail-content")!;
  const backBtn = app.querySelector<HTMLButtonElement>("#back-btn")!;

  backBtn.addEventListener("click", onBack);

  function renderProduct(product: Product): void {
    contentEl.innerHTML = `
      <h2>${product.name}</h2>
      <p class="product-category">${product.category}</p>
      <p class="product-price">$${product.price.toLocaleString("es-CO")}</p>
      <p class="product-stock">Stock: <strong id="stock-value">${product.stock}</strong></p>
      ${
        isAdmin
          ? `<form id="stock-form" class="stock-form">
               <label for="stock-delta">Ajustar stock (ej: -3 o 5)</label>
               <input id="stock-delta" type="number" step="1" required />
               <button type="submit">Aplicar</button>
               <p id="stock-error" class="error" hidden></p>
             </form>`
          : ""
      }
    `;
    contentEl.hidden = false;

    const stockForm = contentEl.querySelector<HTMLFormElement>("#stock-form");
    if (!stockForm) {
      return;
    }

    const deltaInput = contentEl.querySelector<HTMLInputElement>("#stock-delta")!;
    const stockErrorEl = contentEl.querySelector<HTMLParagraphElement>("#stock-error")!;
    const stockValueEl = contentEl.querySelector<HTMLElement>("#stock-value")!;

    stockForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      stockErrorEl.hidden = true;

      const delta = Number(deltaInput.value);
      if (!Number.isInteger(delta) || delta === 0) {
        stockErrorEl.textContent = "Ingresa un numero entero distinto de 0.";
        stockErrorEl.hidden = false;
        return;
      }

      try {
        const updated = await adjustStock(product.id, delta);
        stockValueEl.textContent = String(updated.stock);
        deltaInput.value = "";
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "No se pudo conectar con el servidor";
        stockErrorEl.textContent = message;
        stockErrorEl.hidden = false;
      }
    });
  }

  try {
    const product = await getProduct(productId);
    statusEl.textContent = "";
    renderProduct(product);
  } catch (error) {
    statusEl.textContent = "";
    const message = error instanceof ApiError ? error.message : "No se pudo conectar con el servidor";
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}
