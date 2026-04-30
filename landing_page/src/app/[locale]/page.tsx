import Nav from '@/components/sections/Nav';
import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import HowItWorks from '@/components/sections/HowItWorks';
import Pricing from '@/components/sections/Pricing';
import Download from '@/components/sections/Download';
import Footer from '@/components/sections/Footer';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Download />
      </main>
      <Footer />
    </>
  );
}
