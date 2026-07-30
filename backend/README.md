# Backend — FastAPI

## Requisitos
- Python 3.11+ (probado con 3.14)

## Instalacion

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Ejecutar

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- API: http://127.0.0.1:8000
- Docs interactivas (Swagger): http://127.0.0.1:8000/docs

## Usuarios mock (hardcodeados, sin base de datos)

| username | password  | role  |
|----------|-----------|-------|
| admin    | admin123  | ADMIN |
| user     | user123   | USER  |

## Endpoints

### Autenticacion

- `POST /auth/login` — recibe `{ "username", "password" }`, devuelve `{ "access_token", "token_type", "expires_in" }` en el body y ademas setea una cookie `refresh_token` (`HttpOnly`, `SameSite=Lax`, `path=/auth`, 7 dias). El access token expira en 15 minutos.
- `POST /auth/refresh` — no recibe body: lee el refresh token de la cookie, y devuelve un `access_token` nuevo (+ setea una cookie `refresh_token` nueva). El refresh token se **rota**: se invalida al leerlo (un mismo refresh token solo sirve una vez), asi que un reuso del mismo token devuelve `401`. Tambien devuelve `401` si falta la cookie, si el token no es de tipo `refresh` (ej. si se manda un access token), si esta vencido, o si ya fue usado/revocado.
- `POST /auth/logout` — requiere `Authorization: Bearer <token>`. Revoca el access token (en memoria) y, si hay cookie `refresh_token`, tambien la revoca y la borra del navegador (sin esto, ese refresh token seguiria vigente y podria generar access tokens nuevos despues del logout).
- Cualquier request sin token, con token invalido, expirado o revocado devuelve `401 Unauthorized`.

**Por que cookie y no JSON:** el refresh token es el credential de mayor duracion (7 dias); si viviera en `sessionStorage`/`localStorage` o en el body de una respuesta JSON accesible a JS, un XSS podria robarlo con solo leer el storage. Como cookie `HttpOnly`, JS no puede leerla ni escribirla, asi que ese vector queda cerrado. El costo es que las cookies viajan solas en cada request al mismo origen/sitio, lo que reintroduce riesgo de CSRF en `POST`/`PATCH` — mitigado aqui con `SameSite=Lax` (el navegador no la manda en requests cross-site de terceros) y con el proxy de Vite en dev (ver `frontend/vite.config.ts`), que hace que frontend y backend sean el mismo origen desde la perspectiva del navegador.

### Catalogo de productos

Modelo `Product`: `{ "id", "name", "category", "price", "stock" }`. Sin base de datos: se guarda en una lista en memoria (`app/products/store.py`), se reinicia si el servidor se reinicia. Se precarga con 4 productos de ejemplo.

- `GET /products` — lista productos. Requiere token valido (ADMIN o USER). Soporta filtro `?category=<valor>` (comparacion insensible a mayusculas).
- `GET /products/{id}` — detalle de un producto. `404` si no existe.
- `POST /products` — crea un producto. Requiere rol ADMIN (`403` si es USER).
  - `price` debe ser mayor a 0 y `name`/`category` no pueden ir vacios: si fallan, `422` con el detalle del campo (validacion de Pydantic).
  - `name` duplicado (case-insensitive) devuelve `409 Conflict`.
  - El `id` lo asigna siempre el backend; si el cliente lo envia en el body se ignora (el schema `ProductCreate` no tiene ese campo).
- `PATCH /products/{id}/stock` — ajusta el stock. Requiere rol ADMIN. Recibe `{ "delta": <int> }` (puede ser negativo).
  - Si `stock + delta` queda en 0, es valido.
  - Si `stock + delta` queda negativo, devuelve `409 Conflict` con el stock disponible en el detalle (no se aplica el cambio).
  - `404` si el producto no existe.

Cualquiera de los endpoints anteriores devuelve `401 Unauthorized` si el token es ausente, invalido, expirado o revocado (misma logica de `auth/dependencies.py`).

### Concurrencia

`POST /products` y `PATCH /products/{id}/stock` protegen su seccion critica (leer -> validar regla de negocio -> escribir sobre la lista en memoria compartida) con un `asyncio.Lock()` (`_products_lock` en `app/products/router.py`). Sin el lock, dos requests concurrentes podrian leer el mismo estado antes de que ninguna escriba (ej. dos altas con el mismo nombre pasando ambas el chequeo de duplicado, o dos ajustes de stock dejandolo negativo). Probado con 10 `PATCH /stock` de `delta: -1` disparados en paralelo sobre un stock de 19: terminan en 9, sin condiciones de carrera.

## Estructura

```
app/
  core/
    config.py     # SECRET_KEY, algoritmo JWT, expiracion, origenes CORS
    security.py   # crear/decodificar JWT
  auth/
    users.py         # usuarios mock
    schemas.py        # modelos Pydantic (login, token, usuario)
    dependencies.py   # get_current_user / require_role -> 401 y 403; store de refresh tokens
    router.py         # /auth/login, /auth/refresh, /auth/logout (cookie HttpOnly del refresh token)
  products/
    schemas.py         # modelos Pydantic (ProductCreate, StockAdjust, Product)
    store.py           # almacenamiento en memoria + reglas (nombre duplicado, etc.)
    router.py          # /products (GET, GET/{id}, POST, PATCH/{id}/stock)
  main.py              # app FastAPI, CORS, registro de routers
```
