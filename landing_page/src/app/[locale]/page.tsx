import Nav from '@/components/sections/Nav';
import Hero from '@/components/sections/Hero';
import ProblemSection from '@/components/sections/ProblemSection';
import Features from '@/components/sections/Features';
import DemoSection from '@/components/sections/DemoSection';
import HowItWorks from '@/components/sections/HowItWorks';
import Pricing from '@/components/sections/Pricing';
import Faq from '@/components/sections/Faq';
import TrustSection from '@/components/sections/TrustSection';
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
        <ProblemSection />
        <Features />
        <DemoSection />
        <HowItWorks />
        <Pricing />
        <Faq />
        <TrustSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
