# Tech Test

Sistema con backend en Python/FastAPI y frontend en TypeScript + HTML + CSS
(sin framework), sin base de datos.

## Como correrlo

1. Backend: ver [`backend/README.md`](backend/README.md) (`uvicorn` en el puerto 8000).
2. Frontend: ver [`frontend/README.md`](frontend/README.md) (`npm run dev` en el puerto 5173).

Ambos deben estar corriendo al mismo tiempo; el frontend consume la API en `http://127.0.0.1:8000`.

## Fase 1: autenticacion (JWT)

- Login con usuarios mock (`admin`/`admin123` = ADMIN, `user`/`user123` = USER).
- Access token JWT con expiracion de 15 minutos.
- Logout que revoca el token (blacklist en memoria).
- Autorizacion por rol: solo ADMIN puede `POST`/`PATCH`; `USER` recibe `403`.
- Cualquier request sin token / invalido / expirado / revocado recibe `401`.
- Frontend con pantalla de login, token en `sessionStorage`, interceptor que
  agrega el token a cada request y que ante un `401` limpia la sesion y
  redirige al login.

## Fase 2: catalogo de productos

- Backend: `GET /products` (filtro `?category=`), `GET /products/{id}`,
  `POST /products` (ADMIN) y `PATCH /products/{id}/stock` (ADMIN), con las
  reglas de negocio (stock nunca negativo, precio > 0, nombre no vacio ni
  duplicado, id asignado por backend, `404`/`409`/`422` segun el caso). Ver
  detalle en [`backend/README.md`](backend/README.md).
- Frontend: catalogo en tarjetas con filtro por categoria, detalle de
  producto al hacer clic, formulario de creacion visible solo para ADMIN, y
  estados visibles de carga / error / lista vacia. Ver detalle en
  [`frontend/README.md`](frontend/README.md).

## Branch feat/bonus-features

En esta rama se tienen cambios en la experiencia de usuario y manejo de cookies con httpOnly. Asimismo se implementó la funcionalidad de refresh_token junto con el manejo de concurrencia en algunas funcionalidades para mantener la coherencia en el stock.
