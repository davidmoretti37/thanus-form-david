import { FC } from 'react';
import { useHomeContent } from '@/hooks/use-home-content';
import { CTASection } from './sections/cta-section';
import { FooterSection } from './sections/footer-section';
import { HeroSection } from './sections/hero-section';
import { OpenSourceSection } from './sections/open-source-section';
import { PricingSection } from './sections/pricing-section';
import { BentoSection } from './sections/bento-section';
import { CapabilitiesSection } from './sections/capabilities-section';

export const HomePage: FC = () => {
  const { siteConfig } = useHomeContent();
  
  return (
    <div className="w-full divide-y divide-border">
      <HeroSection hero={siteConfig.hero} cta={siteConfig.cta} />
      <CapabilitiesSection />
      <BentoSection />
      <OpenSourceSection />
      <PricingSection 
        title={siteConfig.pricing.title}
        description={siteConfig.pricing.description}
      />
      <CTASection />
      <FooterSection />
    </div>
  );
};

export default HomePage;
