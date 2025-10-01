'use client';

import Image from 'next/image';

interface KortixLogoProps {
  size?: number;
}

/**
 * KortixLogo
 * Always renders the blue gradient symbol without any color inversion,
 * ensuring it matches the Home header gradient exactly in all themes.
 */
export function KortixLogo({ size = 24 }: KortixLogoProps) {
  return (
    <Image
      src="/kortix-symbol.svg"
      alt="Tars"
      width={size}
      height={size}
      className="flex-shrink-0"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  );
}
