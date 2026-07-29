# Tech Test

Sistema con backend en Python/FastAPI y frontend en TypeScript + HTML + CSS
(sin framework), sin base de datos.

## Como correrlo

1. Backend: ver [`backend/README.md`](backend/README.md) (`uvicorn` en el puerto 8000).
2. Frontend: ver [`frontend/README.md`](frontend/README.md) (`npm run dev` en el puerto 5173).

Ambos deben estar corriendo al mismo tiempo; el frontend consume la API en `http://127.0.0.1:8000`.

## Fase actual: autenticacion (JWT)

- Login con usuarios mock (`admin`/`admin123` = ADMIN, `user`/`user123` = USER).
- Access token JWT con expiracion de 15 minutos.
- Logout que revoca el token (blacklist en memoria).
- Autorizacion por rol: solo ADMIN puede `POST`/`PATCH`; `USER` recibe `403`.
- Cualquier request sin token / invalido / expirado / revocado recibe `401`.
- Frontend con pantalla de login, token en `sessionStorage`, interceptor que
  agrega el token a cada request y que ante un `401` limpia la sesion y
  redirige al login.

## Proxima fase

Catalogo de productos (CRUD real reemplazando el endpoint `/resources` de
ejemplo), manteniendo las mismas reglas de autorizacion.
