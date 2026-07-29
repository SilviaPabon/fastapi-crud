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

- `POST /auth/login` — recibe `{ "username", "password" }`, devuelve `{ "access_token", "token_type", "expires_in" }`. El token expira en 15 minutos.
- `POST /auth/logout` — requiere `Authorization: Bearer <token>`. Revoca el token (en memoria) para que deje de ser valido.
- `GET /resources` — requiere token valido (ADMIN o USER).
- `POST /resources` / `PATCH /resources/{id}` — requiere token valido **y** rol ADMIN; con rol USER devuelve `403 Forbidden`.
- Cualquier request sin token, con token invalido, expirado o revocado devuelve `401 Unauthorized`.

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
  resources/           # endpoints de ejemplo para probar 401/403 (base del futuro catalogo)
  main.py              # app FastAPI, CORS, registro de routers
```
