'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface InventuAILogoProps {
  size?: number;
}
export function InventuAILogo({ size = 24 }: InventuAILogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mount, we can access the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Image
        src="/agent-circles-logo-new.png"
        alt="InventuAI"
        width={size}
        height={size}
        className="flex-shrink-0"
      />
  );
}
