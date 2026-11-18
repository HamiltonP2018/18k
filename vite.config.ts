import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el sitio funciona igual en Vercel, Netlify o GitHub Pages
  // (incluso dentro de una subcarpeta). La navegación usa HashRouter.
  base: './',
  plugins: [react()],
  server: {
    // Permite abrir la página desde el celular en la misma red Wi-Fi.
    host: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
})
