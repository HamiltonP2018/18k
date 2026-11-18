/**
 * Inicio: la historia completa en una sola página con scroll.
 * Cada sección tiene un id (ver lib/routes.ts → SECTIONS) para el dock.
 */
import { Page } from '../components/Page'
import { HeroSection } from '../features/home/HeroSection'
import { CounterSection } from '../features/home/CounterSection'
import { TimelineSection } from '../features/story/TimelineSection'
import { CarouselSection } from '../features/gallery/CarouselSection'
import { MomentsSection } from '../features/moments/MomentsSection'
import { ReasonsSection } from '../features/reasons/ReasonsSection'
import { LetterTeaser } from '../features/letter/LetterTeaser'
import { OpenWhenSection } from '../features/openwhen/OpenWhenSection'
import { PromisesSection } from '../features/promises/PromisesSection'
import { FinaleSection } from '../features/finale/FinaleSection'
import { CornerSection } from '../features/notes/CornerSection'
import styles from './HomePage.module.css'

export default function HomePage() {
  return (
    <Page className={styles.home} label="Nuestra historia">
      <HeroSection />
      <CounterSection />
      <TimelineSection />
      <CarouselSection />
      <MomentsSection />
      <ReasonsSection />
      <LetterTeaser />
      <OpenWhenSection />
      <PromisesSection />
      <FinaleSection />
      <CornerSection />
    </Page>
  )
}
