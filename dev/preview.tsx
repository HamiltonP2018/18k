/**
 * Herramienta de desarrollo: vista previa AISLADA de un componente.
 *   npm run dev → http://localhost:5173/dev/preview.html?c=home/HeroSection
 *   ?c=<carpeta>/<Archivo> dentro de src/features (exportación con el mismo nombre o default)
 *   &route=/recuerdos   ruta inicial del HashRouter (para páginas)
 * Solo importa el componente pedido, así un error en otra sección no la rompe.
 * No forma parte del build de producción.
 */
import { StrictMode, Suspense, lazy, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import '@fontsource-variable/cormorant-garamond/wght.css'
import '@fontsource-variable/cormorant-garamond/wght-italic.css'
import '@fontsource-variable/montserrat/wght.css'
import '@fontsource-variable/cinzel/wght.css'
import '@fontsource/alex-brush/400.css'
import '../src/styles/tokens.css'
import '../src/styles/global.css'
import { AppProvider } from '../src/context/AppContext'
import { MusicProvider } from '../src/context/MusicContext'
import { ParticleBackground } from '../src/components/ParticleBackground'
import { MusicToggle } from '../src/components/MusicToggle'
import { Dock } from '../src/components/Dock'

const modules = import.meta.glob('../src/features/**/*.tsx')
const params = new URLSearchParams(location.search)
const c = params.get('c') ?? ''
const route = params.get('route') ?? '/'
const chrome = params.get('chrome') !== '0'
const key = `../src/features/${c}.tsx`
const name = c.split('/').pop() ?? ''

const Target = lazy(async () => {
  const loader = modules[key]
  if (!loader) {
    return { default: () => <p style={{ padding: 40 }}>No existe {key}. Opciones: {Object.keys(modules).join(', ')}</p> }
  }
  const mod = (await loader()) as Record<string, ComponentType>
  return { default: mod[name] ?? mod.default }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={[route]}>
      <AppProvider>
        <MusicProvider>
          <ParticleBackground />
          <main style={{ position: 'relative', zIndex: 10 }}>
            <Suspense fallback={null}>
              <Target />
            </Suspense>
          </main>
          {chrome && <MusicToggle />}
          {chrome && <Dock />}
          <div className="vignette" aria-hidden />
          <div className="grain" aria-hidden />
        </MusicProvider>
      </AppProvider>
    </MemoryRouter>
  </StrictMode>,
)
