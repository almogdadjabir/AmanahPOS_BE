import Nav from '@/components/sections/Nav';
import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import HowItWorks from '@/components/sections/HowItWorks';
import Pricing from '@/components/sections/Pricing';
import CtaSection from '@/components/sections/CtaSection';
import Footer from '@/components/sections/Footer';

export default function HomePage() {
  return (
    <>
      {/* Background layers */}
      <div className="bg-layer bg-aurora-1" aria-hidden="true" />
      <div className="bg-layer bg-aurora-2" aria-hidden="true" />
      <div className="bg-layer bg-grid" aria-hidden="true" />
      <div className="bg-layer bg-scanline" aria-hidden="true" />
      <div className="bg-layer bg-noise" aria-hidden="true" />

      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
