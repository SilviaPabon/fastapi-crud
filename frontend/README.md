# Frontend — TypeScript + Vite (sin frameworks)

## Requisitos
- Node.js 18+

## Instalacion

```bash
cd frontend
npm install
```

## Ejecutar (modo desarrollo)

```bash
cd frontend
npm run dev
```

Abrir http://localhost:5173. Requiere que el backend este corriendo en http://127.0.0.1:8000 (ver `backend/README.md`).

## Build de produccion

```bash
npm run build
```

Genera los archivos estaticos en `dist/`.

## Estructura

```
src/
  api/
    http.ts        # wrapper sobre fetch: agrega el header Authorization,
                    # renueva el access token de forma transparente ante un
                    # 401 (ver seccion de abajo), y traduce los errores 422
                    # de FastAPI (lista por campo) a texto
    auth.ts         # login() / logout()
    products.ts      # listProducts() / getProduct() / createProduct() / adjustStock()
  auth/
    session.ts        # access_token en memoria (variable de modulo, nunca en
                       # storage); el refresh_token vive en una cookie HttpOnly
                       # que este archivo ni siquiera puede leer
  views/
    login-view.ts            # pantalla de login
    product-list-view.ts      # tarjetas de productos + filtro por categoria +
                               # formulario "nuevo producto" (solo visible ADMIN) +
                               # estados de carga / error / lista vacia
    product-detail-view.ts    # detalle de un producto + ajuste de stock (solo ADMIN)
  main.ts                     # router minimo: login <-> lista <-> detalle
vite.config.ts                # proxy /auth y /products -> backend en dev
                               # (ver seccion de cookies mas abajo)
```

## Renovacion transparente del access token

El access token dura 15 minutos y vive **solo en memoria** (una variable de
modulo en `auth/session.ts`, nunca en `sessionStorage`/`localStorage`): un
XSS que consiga ejecutar JS arbitrario no puede robarlo escaneando el
storage del navegador. La contrapartida es que se pierde en cada recarga de
pagina (F5), asi que `main.ts` lo repone en silencio al arrancar la app
(`tryRestoreSession()`) usando el refresh token de la cookie, sin pedirle
credenciales de nuevo al usuario.

Cuando una request cualquiera recibe `401` (y no es `/auth/login` ni
`/auth/refresh`), `api/http.ts` intenta renovar el access token antes de
rendirse:

1. Llama a `POST /auth/refresh` con `credentials: "include"`: el navegador
   manda solo la cookie `refresh_token`, JS nunca la toca directamente.
2. Si el backend devuelve un access token nuevo, lo guarda en memoria y
   **reintenta la request original una sola vez**.
3. Si el refresh tambien falla (cookie vencida, revocada o inexistente),
   recien ahi se limpia la sesion y se redirige a login.

Si varias requests disparan un `401` al mismo tiempo (ej. dos `fetch` en
paralelo justo cuando expira el token), no se generan multiples refresh
concurrentes: todas esperan la misma promesa compartida (`refreshInFlight`),
y solo la primera ejecuta la llamada real a `/auth/refresh`.

### Por que hay un `vite.config.ts` con proxy

El backend setea el refresh token como cookie `HttpOnly` + `SameSite=Lax`
(ver `backend/README.md`). `SameSite=Lax` solo se manda en requests
same-site; en dev, frontend (`localhost:5173`) y backend (`127.0.0.1:8000`)
son puertos/hosts distintos, es decir, otro origen. El proxy de Vite
resuelve esto: el frontend llama a rutas relativas (`/auth/...`,
`/products/...`) que el propio servidor de Vite reenvia al backend, asi que
para el navegador la cookie nunca sale de `localhost:5173` — sigue siendo
same-site sin necesitar `SameSite=None` ni HTTPS local.

## Reglas de UI por rol

El rol (`ADMIN`/`USER`) se lee del propio JWT: `auth/session.ts` decodifica el
payload del token en el navegador (sin verificar firma, solo para decidir que
mostrar) y expone `getRole()`/`getTokenPayload()`. Con eso, `product-list-view.ts`
oculta el formulario de creacion y `product-detail-view.ts` oculta el control
de ajuste de stock si el rol no es `ADMIN`. Esto es solo cosmetico: la
autorizacion real la sigue aplicando el backend en cada request (`403` si un
USER intenta `POST`/`PATCH`), asi que aunque alguien manipule el DOM no gana
ningun permiso real.
