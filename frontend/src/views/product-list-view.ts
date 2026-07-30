import { ApiError } from "../api/http";
import { logout as logoutRequest } from "../api/auth";
import { createProduct, listProducts, type Product, type ProductCreate } from "../api/products";
import { clearToken, getTokenPayload } from "../auth/session";

interface ProductListCallbacks {
  onLoggedOut: () => void;
  onSelectProduct: (productId: number) => void;
}

export async function renderProductListView(app: HTMLElement, callbacks: ProductListCallbacks): Promise<void> {
  const payload = getTokenPayload();
  const isAdmin = payload?.role === "ADMIN";

  app.innerHTML = `
    <div class="dashboard-page">
      <header>
        <span>Sesion: <strong>${payload?.sub ?? ""}</strong> (${payload?.role ?? ""})</span>
        <button id="logout-btn">Cerrar sesion</button>
      </header>

      <section>
        <h2>Productos</h2>

        <div class="filter-bar">
          <label for="category-filter">Categoria</label>
          <select id="category-filter">
            <option value="">Todas</option>
          </select>
        </div>

        <p id="list-status" class="hint"></p>
        <p id="list-error" class="error" hidden></p>
        <div id="products-grid" class="products-grid"></div>

        ${
          isAdmin
            ? `<form id="create-form" class="create-form">
                 <h3>Nuevo producto (solo ADMIN)</h3>
                 <label for="product-name">Nombre</label>
                 <input id="product-name" type="text" required />

                 <label for="product-category">Categoria</label>
                 <input id="product-category" type="text" required />

                 <label for="product-price">Precio</label>
                 <input id="product-price" type="number" min="0.01" step="0.01" required />

                 <label for="product-stock">Stock inicial</label>
                 <input id="product-stock" type="number" min="0" step="1" value="0" required />

                 <button type="submit">Crear producto</button>
                 <p id="create-error" class="error" hidden></p>
               </form>`
            : `<p class="hint">Tu rol (USER) solo puede consultar productos.</p>`
        }
      </section>
    </div>
  `;

  const gridEl = app.querySelector<HTMLDivElement>("#products-grid")!;
  const statusEl = app.querySelector<HTMLParagraphElement>("#list-status")!;
  const errorEl = app.querySelector<HTMLParagraphElement>("#list-error")!;
  const categorySelect = app.querySelector<HTMLSelectElement>("#category-filter")!;
  const logoutBtn = app.querySelector<HTMLButtonElement>("#logout-btn")!;

  let knownCategories: string[] = [];

  function renderCategoryOptions(): void {
    const current = categorySelect.value;
    categorySelect.innerHTML =
      `<option value="">Todas</option>` +
      knownCategories.map((category) => `<option value="${category}">${category}</option>`).join("");
    categorySelect.value = current;
  }

  function renderProducts(products: Product[]): void {
    if (products.length === 0) {
      gridEl.innerHTML = "";
      statusEl.textContent = "No hay productos para mostrar.";
      return;
    }

    statusEl.textContent = "";
    gridEl.innerHTML = products
      .map(
        (product) => `
          <article class="product-card" data-id="${product.id}">
            <h3>${product.name}</h3>
            <p class="product-category">${product.category}</p>
            <p class="product-price">$${product.price.toLocaleString("es-CO")}</p>
            <p class="product-stock">Stock: ${product.stock}</p>
          </article>
        `,
      )
      .join("");

    gridEl.querySelectorAll<HTMLElement>(".product-card").forEach((card) => {
      card.addEventListener("click", () => {
        callbacks.onSelectProduct(Number(card.dataset.id));
      });
    });
  }

  async function loadProducts(category: string): Promise<void> {
    statusEl.textContent = "Cargando productos...";
    errorEl.hidden = true;
    gridEl.innerHTML = "";
    try {
      const products = await listProducts(category || undefined);
      renderProducts(products);
    } catch (error) {
      statusEl.textContent = "";
      const message = error instanceof ApiError ? error.message : "No se pudo conectar con el servidor";
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }

  categorySelect.addEventListener("change", () => {
    void loadProducts(categorySelect.value);
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await logoutRequest();
    } catch {
      // Si la llamada falla (ej. token ya expirado), igual limpiamos la
      // sesion local: el objetivo del boton es que el usuario quede
      // deslogueado en el frontend pase lo que pase en el backend.
    }
    clearToken();
    callbacks.onLoggedOut();
  });

  const createForm = app.querySelector<HTMLFormElement>("#create-form");
  if (createForm) {
    const createErrorEl = app.querySelector<HTMLParagraphElement>("#create-error")!;

    createForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      createErrorEl.hidden = true;

      const nameInput = createForm.querySelector<HTMLInputElement>("#product-name")!;
      const categoryInput = createForm.querySelector<HTMLInputElement>("#product-category")!;
      const priceInput = createForm.querySelector<HTMLInputElement>("#product-price")!;
      const stockInput = createForm.querySelector<HTMLInputElement>("#product-stock")!;

      const price = Number(priceInput.value);
      const stock = Number(stockInput.value);

      // Validacion en el cliente: evita un viaje al backend para errores
      // obvios. El backend sigue siendo quien valida de verdad (422/409).
      if (!nameInput.value.trim() || !categoryInput.value.trim() || !(price > 0) || !(stock >= 0)) {
        createErrorEl.textContent = "Revisa los campos: nombre, categoria, precio (> 0) y stock (>= 0).";
        createErrorEl.hidden = false;
        return;
      }

      const payload: ProductCreate = {
        name: nameInput.value.trim(),
        category: categoryInput.value.trim(),
        price,
        stock,
      };

      try {
        const created = await createProduct(payload);
        createForm.reset();
        stockInput.value = "0";
        if (!knownCategories.includes(created.category)) {
          knownCategories = [...knownCategories, created.category].sort();
          renderCategoryOptions();
        }
        await loadProducts(categorySelect.value);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "No se pudo conectar con el servidor";
        createErrorEl.textContent = message;
        createErrorEl.hidden = false;
      }
    });
  }

  statusEl.textContent = "Cargando productos...";
  try {
    const products = await listProducts();
    knownCategories = Array.from(new Set(products.map((product) => product.category))).sort();
    renderCategoryOptions();
    renderProducts(products);
  } catch (error) {
    statusEl.textContent = "";
    const message = error instanceof ApiError ? error.message : "No se pudo conectar con el servidor";
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}
