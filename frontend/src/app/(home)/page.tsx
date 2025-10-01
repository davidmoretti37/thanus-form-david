'use client';

import { ModalProviders } from '@/providers/modal-providers';
import { BackgroundAALChecker } from '@/components/auth/background-aal-checker';
import { HomePage } from '@/components/home/home-page';

export default function Home() {
  return (
    <>
      <ModalProviders />
      <BackgroundAALChecker>
        <HomePage />
      </BackgroundAALChecker>
    </>
  );
}
