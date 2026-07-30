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
o
```bash
cd backend
fastapi dev
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

- `POST /auth/login` — recibe `{ "username", "password" }`, devuelve `{ "access_token", "token_type", "expires_in" }`. El token expira en 15 minutos.
- `POST /auth/logout` — requiere `Authorization: Bearer <token>`. Revoca el token (en memoria) para que deje de ser valido.
- Cualquier request sin token, con token invalido, expirado o revocado devuelve `401 Unauthorized`.

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

## Estructura

```
app/
  core/
    config.py     # SECRET_KEY, algoritmo JWT, expiracion, origenes CORS
    security.py   # crear/decodificar JWT
  auth/
    users.py         # usuarios mock
    schemas.py        # modelos Pydantic (login, token, usuario)
    dependencies.py   # get_current_user / require_role -> 401 y 403
    router.py         # /auth/login, /auth/logout
  products/
    schemas.py         # modelos Pydantic (ProductCreate, StockAdjust, Product)
    store.py           # almacenamiento en memoria + reglas (nombre duplicado, etc.)
    router.py          # /products (GET, GET/{id}, POST, PATCH/{id}/stock)
  main.py              # app FastAPI, CORS, registro de routers
```
