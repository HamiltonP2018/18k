/**
 * Flujo de la experiencia:
 *   1. Candado (contraseña = nuestra fecha)
 *   2. Intro cinematográfica (se puede saltar)
 *   3. La historia: inicio + vistas (recuerdos, momentos, carta)
 */
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AnimatePresence } from 'motion/react'
import { AppProvider, useApp } from './context/AppContext'
import { MusicProvider } from './context/MusicContext'
import { ParticleBackground } from './components/ParticleBackground'
import { MusicToggle } from './components/MusicToggle'
import { Dock } from './components/Dock'
import { LockScreen } from './features/lock/LockScreen'
import { IntroSequence } from './features/intro/IntroSequence'
import { WishMoment } from './features/wish/WishMoment'
import HomePage from './pages/HomePage'
import { ROUTES } from './lib/routes'

const GalleryPage = lazy(() => import('./features/gallery/GalleryPage'))
const MomentsPage = lazy(() => import('./features/moments/MomentsPage'))
const LetterPage = lazy(() => import('./features/letter/LetterPage'))

function AppRoutes() {
  const location = useLocation()
  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route
            path={ROUTES.gallery}
            element={
              <Suspense fallback={null}>
                <GalleryPage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.moments}
            element={
              <Suspense fallback={null}>
                <MomentsPage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.letter}
            element={
              <Suspense fallback={null}>
                <LetterPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
      </AnimatePresence>
      <Dock />
      <WishMoment />
    </>
  )
}

function Experience() {
  const { unlocked, introDone } = useApp()
  const stage = !unlocked ? 'lock' : !introDone ? 'intro' : 'story'
  return (
    <>
      <AnimatePresence mode="wait">
        {stage === 'lock' && <LockScreen key="lock" />}
        {stage === 'intro' && <IntroSequence key="intro" />}
        {stage === 'story' && <AppRoutes key="story" />}
      </AnimatePresence>
      <MusicToggle />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <MusicProvider>
        <ParticleBackground />
        <Experience />
        <div className="vignette" aria-hidden />
        <div className="grain" aria-hidden />
      </MusicProvider>
    </AppProvider>
  )
}
