import { FC } from 'react';
import Orb from '@/components/home/ui/Orb';
import { FooterSection } from './sections/footer-section';
import HeroScrollDemo from '@/components/home/HeroScrollDemo';

export const HomePage: FC = () => {
  return (
    <div className="w-full flex flex-col items-center gap-8">
      <HeroScrollDemo />
      {/* Blue brand circle */}
      <div className="w-full max-w-5xl mx-auto px-4 h-[420px]">
        <Orb />
      </div>

      {/* Footer items */}
      <FooterSection />
    </div>
  );
};

export default HomePage;
