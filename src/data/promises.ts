/**
 * Promesas — tomadas de las palabras de la carta.
 * `icon` es el nombre de un ícono de lucide-react ya mapeado en la sección.
 */
export type PromiseIcon = 'heart-handshake' | 'ear' | 'hand-heart' | 'home' | 'sparkles' | 'route' | 'infinity'

export interface LovePromise {
  title: string
  text: string
  icon: PromiseIcon
}

export const promises: LovePromise[] = [
  { title: 'Elegirte siempre', text: 'Seguir eligiéndote, incluso en los días difíciles.', icon: 'heart-handshake' },
  { title: 'Escucharte', text: 'Aprender a escucharte mejor y a comprenderte de verdad.', icon: 'ear' },
  { title: 'Cuidarnos', text: 'Cuidar más de ti y de nosotros, todos los días.', icon: 'hand-heart' },
  { title: 'Nuestro lugar seguro', text: 'Que los dos podamos sentirnos seguros, queridos y acompañados.', icon: 'home' },
  { title: 'Más momentos', text: 'Seguir creando recuerdos contigo y encontrar nuevas razones para enamorarnos cada día.', icon: 'sparkles' },
  { title: 'Vencer la distancia', text: 'Seguir caminando juntos, superando la distancia paso a paso.', icon: 'route' },
  { title: 'Nuestro futuro', text: 'Construir poco a poco ese futuro que tantas veces hemos imaginado.', icon: 'infinity' },
]
