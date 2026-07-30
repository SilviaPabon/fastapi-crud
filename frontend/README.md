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
    session.ts        # guarda/lee access_token y refresh_token en sessionStorage, decodifica el rol
  views/
    login-view.ts            # pantalla de login
    product-list-view.ts      # tarjetas de productos + filtro por categoria +
                               # formulario "nuevo producto" (solo visible ADMIN) +
                               # estados de carga / error / lista vacia
    product-detail-view.ts    # detalle de un producto + ajuste de stock (solo ADMIN)
  main.ts                     # router minimo: login <-> lista <-> detalle
```

## Renovacion transparente del access token

El access token dura 15 minutos. Cuando una request cualquiera recibe `401`
(y no es `/auth/login` ni `/auth/refresh`), `api/http.ts` intenta renovarlo
automaticamente antes de rendirse:

1. Llama a `POST /auth/refresh` con el `refresh_token` guardado.
2. Si el backend devuelve un par nuevo de tokens, los guarda y **reintenta la
   request original una sola vez** con el access token nuevo.
3. Si el refresh tambien falla (refresh token vencido, revocado o
   inexistente), recien ahi se limpia la sesion y se redirige a login — el
   mismo comportamiento que habia antes de esto.

Si varias requests disparan un `401` al mismo tiempo (ej. dos `fetch` en
paralelo justo cuando expira el token), no se generan multiples refresh
concurrentes: todas esperan la misma promesa compartida (`refreshInFlight`),
y solo la primera ejecuta la llamada real a `/auth/refresh`.

## Reglas de UI por rol

El rol (`ADMIN`/`USER`) se lee del propio JWT: `auth/session.ts` decodifica el
payload del token en el navegador (sin verificar firma, solo para decidir que
mostrar) y expone `getRole()`/`getTokenPayload()`. Con eso, `product-list-view.ts`
oculta el formulario de creacion y `product-detail-view.ts` oculta el control
de ajuste de stock si el rol no es `ADMIN`. Esto es solo cosmetico: la
autorizacion real la sigue aplicando el backend en cada request (`403` si un
USER intenta `POST`/`PATCH`), asi que aunque alguien manipule el DOM no gana
ningun permiso real.
