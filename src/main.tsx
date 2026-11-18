import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'

// Tipografías autoalojadas (funcionan sin depender de Google Fonts)
import '@fontsource-variable/cormorant-garamond/wght.css'
import '@fontsource-variable/cormorant-garamond/wght-italic.css'
import '@fontsource-variable/montserrat/wght.css'
import '@fontsource-variable/cinzel/wght.css'
import '@fontsource/alex-brush/400.css'

import './styles/tokens.css'
import './styles/global.css'
import App from './App'

// El scroll lo restaura <Page> al navegar; evita que el navegador interfiera.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
