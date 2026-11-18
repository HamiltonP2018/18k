import { useLocation, useNavigate } from 'react-router'
import { ROUTES } from '../lib/routes'

/** Regresa en el historial si se llegó navegando dentro de la app; si no, va al inicio. */
export function useGoBack(): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    // La primera entrada del historial de la app tiene key "default".
    if (location.key !== 'default' && window.history.length > 1) navigate(-1)
    else navigate(ROUTES.home)
  }
}
