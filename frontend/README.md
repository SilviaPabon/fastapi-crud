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
                    # reacciona a 401 (limpia token + redirige) y traduce
                    # los errores 422 de FastAPI (lista por campo) a texto
    auth.ts         # login() / logout()
    products.ts      # listProducts() / getProduct() / createProduct() / adjustStock()
  auth/
    session.ts        # guarda/lee el token en sessionStorage, decodifica el rol
  views/
    login-view.ts            # pantalla de login
    product-list-view.ts      # tarjetas de productos + filtro por categoria +
                               # formulario "nuevo producto" (solo visible ADMIN) +
                               # estados de carga / error / lista vacia
    product-detail-view.ts    # detalle de un producto + ajuste de stock (solo ADMIN)
  main.ts                     # router minimo: login <-> lista <-> detalle
```

## Reglas de UI por rol

El rol (`ADMIN`/`USER`) se lee del propio JWT: `auth/session.ts` decodifica el
payload del token en el navegador (sin verificar firma, solo para decidir que
mostrar) y expone `getRole()`/`getTokenPayload()`. Con eso, `product-list-view.ts`
oculta el formulario de creacion y `product-detail-view.ts` oculta el control
de ajuste de stock si el rol no es `ADMIN`. Esto es solo cosmetico: la
autorizacion real la sigue aplicando el backend en cada request (`403` si un
USER intenta `POST`/`PATCH`), asi que aunque alguien manipule el DOM no gana
ningun permiso real.
