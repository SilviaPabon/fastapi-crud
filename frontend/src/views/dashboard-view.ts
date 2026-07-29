import { ApiError } from "../api/http";
import { logout as logoutRequest } from "../api/auth";
import { createItem, listItems, type Item } from "../api/resources";
import { clearToken, getTokenPayload } from "../auth/session";

export async function renderDashboardView(app: HTMLElement, onLoggedOut: () => void): Promise<void> {
  const payload = getTokenPayload();
  const isAdmin = payload?.role === "ADMIN";

  app.innerHTML = `
    <div class="dashboard-page">
      <header>
        <span>Sesion: <strong>${payload?.sub ?? ""}</strong> (${payload?.role ?? ""})</span>
        <button id="logout-btn">Cerrar sesion</button>
      </header>

      <section>
        <h2>Recursos</h2>
        <ul id="items-list"></ul>

        ${
          isAdmin
            ? `<form id="create-form">
                 <input id="item-name" type="text" placeholder="Nombre del recurso" required />
                 <button type="submit">Crear (solo ADMIN)</button>
               </form>`
            : `<p class="hint">Tu rol (USER) solo permite consultar recursos.</p>`
        }
        <p id="dashboard-error" class="error" hidden></p>
      </section>
    </div>
  `;

  const listEl = app.querySelector<HTMLUListElement>("#items-list")!;
  const errorEl = app.querySelector<HTMLParagraphElement>("#dashboard-error")!;
  const logoutBtn = app.querySelector<HTMLButtonElement>("#logout-btn")!;

  function renderItems(items: Item[]): void {
    listEl.innerHTML = items.map((item) => `<li>#${item.id} - ${item.name}</li>`).join("");
  }

  async function loadItems(): Promise<void> {
    try {
      const items = await listItems();
      renderItems(items);
    } catch (error) {
      if (error instanceof ApiError) {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
      }
    }
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      await logoutRequest();
    } catch {
      // Si la llamada falla (ej. token ya expirado), igual limpiamos la
      // sesion local: el objetivo del boton es que el usuario quede
      // deslogueado en el frontend pase lo que pase en el backend.
    }
    clearToken();
    onLoggedOut();
  });

  const createForm = app.querySelector<HTMLFormElement>("#create-form");
  if (createForm) {
    createForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nameInput = createForm.querySelector<HTMLInputElement>("#item-name")!;
      try {
        await createItem(nameInput.value);
        nameInput.value = "";
        await loadItems();
      } catch (error) {
        if (error instanceof ApiError) {
          errorEl.textContent = error.message;
          errorEl.hidden = false;
        }
      }
    });
  }

  await loadItems();
}
