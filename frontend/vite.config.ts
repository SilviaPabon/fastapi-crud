import { defineConfig } from "vite";

// Proxy /auth y /products al backend en dev: asi el navegador ve todo como
// mismo origen (localhost:5173), lo que permite que la cookie HttpOnly del
// refresh token funcione con SameSite=Lax sin necesitar HTTPS local.
export default defineConfig({
  server: {
    proxy: {
      "/auth": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/products": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
});
