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
    http.ts        # wrapper sobre fetch: agrega el header Authorization y
                    # reacciona a 401 limpiando el token y volviendo al login
    auth.ts         # login() / logout()
    resources.ts     # listItems() / createItem()
  auth/
    session.ts        # guarda/lee el token en sessionStorage, decodifica el rol
  views/
    login-view.ts       # pantalla de login
    dashboard-view.ts    # pantalla protegida (oculta "crear" si el rol no es ADMIN)
  main.ts                # router minimo: login <-> dashboard segun haya token
```
