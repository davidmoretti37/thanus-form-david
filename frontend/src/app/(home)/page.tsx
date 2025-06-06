'use client';

import { HeroSection } from '@/components/home/sections/hero-section';
import { ModalProviders } from '@/providers/modal-providers';

export default function Home() {
  return (
    <>
      <ModalProviders />
      <main className="w-full h-screen overflow-hidden">
        <HeroSection />
      </main>
    </>
  );
}