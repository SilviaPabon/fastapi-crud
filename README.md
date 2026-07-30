# Tech Test

Sistema con backend en Python/FastAPI y frontend en TypeScript + HTML + CSS
(sin framework), sin base de datos.

## Como ejecutarlo

1. Backend: ver [`backend/README.md`](backend/README.md) (`uvicorn` en el puerto 8000).
2. Frontend: ver [`frontend/README.md`](frontend/README.md) (`npm run dev` en el puerto 5173).

Ambos deben estar corriendo al mismo tiempo; el frontend consume la API en `http://127.0.0.1:8000`.

## Fase 1: autenticacion (JWT)

- Login con usuarios mock (`admin`/`admin123` = ADMIN, `user`/`user123` = USER).
- Access token JWT con expiracion de 15 minutos.
- Logout que revoca el token (blacklist en memoria).
- Autorizacion por rol: solo ADMIN puede `POST`/`PATCH`; `USER` recibe `403`.
- Cualquier request sin token / invalido / expirado / revocado recibe `401`.
- Refresh token (7 dias, rotativo) con `POST /auth/refresh`; el frontend lo
  usa para renovar el access token de forma transparente ante un `401`, sin
  interrumpir al usuario. Ver `backend/README.md` (seccion Autenticacion) y
  `frontend/README.md` (seccion "Renovacion transparente del access token").
- Seguridad de tokens: el refresh token viaja en una cookie `HttpOnly`
  (invisible a JS, mitiga robo por XSS) en vez de sessionStorage; el access
  token vive solo en memoria en el frontend (nunca en storage persistente).
  Ver `backend/README.md` ("Por que cookie y no JSON") y `frontend/README.md`
  ("Por que hay un vite.config.ts con proxy").

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
- Concurrencia: `POST /products` y `PATCH /products/{id}/stock` protegen su
  seccion critica con `asyncio.Lock()` para evitar condiciones de carrera
  sobre el estado en memoria compartido (nombre duplicado, stock negativo).
  Ver detalle en [`backend/README.md`](backend/README.md) (seccion
  Concurrencia).

## Fase 3: seguridad del token y diseno

- Diseno: paleta de colores centralizada en variables CSS, tipografia y
  espaciados mas cuidados, estados hover/focus en botones/inputs/tarjetas, y
  ajustes responsive basicos. Sin cambios de estructura ni dependencias
  nuevas.
