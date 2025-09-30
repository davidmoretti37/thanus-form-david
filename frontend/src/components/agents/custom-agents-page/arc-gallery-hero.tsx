'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

type ArcGalleryHeroProps = {
  title: string;
  subtitle?: string;
  className?: string;
  icon?: React.ReactNode;
};

export function ArcGalleryHero({
  title,
  subtitle,
  className,
  icon = <Bot className="h-6 w-6 text-foreground" />,
}: ArcGalleryHeroProps) {
  return (
    <div
      className={cn(
        'relative w-full rounded-3xl border border-border/60 overflow-hidden bg-card',
        className,
      )}
    >
      {/* concentric arcs background */}
      <div
        className="absolute inset-0 opacity-[0.6] dark:opacity-[0.35]"
        style={{
          background:
            'repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 42px)',
          WebkitMaskImage:
            'radial-gradient(circle at 50% 50%, black 60%, transparent 100%)',
          maskImage:
            'radial-gradient(circle at 50% 50%, black 60%, transparent 100%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-muted/40 to-transparent pointer-events-none" />

      {/* inner ring */}
      <div className="absolute inset-6 rounded-[28px] border border-border/50 pointer-events-none" />

      {/* center content */}
      <div className="relative flex flex-col items-center justify-center py-16 md:py-20 gap-3">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/70 ring-1 ring-border/60">
          {icon}
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm md:text-base text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
