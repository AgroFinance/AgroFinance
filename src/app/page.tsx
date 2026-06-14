import Navigation from '@/components/layout/Navigation'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/hero/HeroSection'
import FeaturesSection from '@/components/sections/FeaturesSection'
import StatsSection from '@/components/sections/StatsSection'

export default function HomePage() {
  return (
    <main className="relative bg-[#FBF4D6] min-h-screen">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <Footer />
    </main>
  )
}
