import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Vista previa del link (WhatsApp, iMessage…): las redes exigen URLs absolutas
 * en og:image. Render expone la URL pública del sitio en RENDER_EXTERNAL_URL
 * durante el build; con dominio propio, define SITE_URL.
 */
function linkPreview(): Plugin {
  return {
    name: 'link-preview',
    transformIndexHtml() {
      const site = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '')
      const image = site ? `${site}/og.jpg` : './og.jpg'
      return [
        { tag: 'meta', attrs: { property: 'og:image', content: image }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image:type', content: 'image/jpeg' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
        ...(site ? [{ tag: 'meta', attrs: { property: 'og:url', content: `${site}/` }, injectTo: 'head' as const }] : []),
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el sitio funciona igual en Vercel, Netlify o GitHub Pages
  // (incluso dentro de una subcarpeta). La navegación usa HashRouter.
  base: './',
  plugins: [react(), linkPreview()],
  server: {
    // Permite abrir la página desde el celular en la misma red Wi-Fi.
    host: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
})
