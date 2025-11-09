import { PageContainer } from '@/components/page-container'
import { HeroSection } from './components/hero-section'

/**
 * Main landing page for Riviera Ticket - Frame 2
 * Features hero section with movie information and ticket CTA
 */
export default function HomePage() {
  return (
    <PageContainer className="relative">
      <HeroSection />
    </PageContainer>
  )
}
