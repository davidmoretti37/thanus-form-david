'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function LinkButton({ href, children, className }: LinkButtonProps) {
  // Check if it's a Daytona or CloudFlare link that should be rendered as a button
  const isDaytonaLink = href.includes('daytona') || href.includes('.daytona.') || href.includes('daytona.io');
  const isCloudFlareLink = href.includes('cloudflare') || href.includes('.cloudflare.') || href.includes('workers.dev') || href.includes('.pages.dev');
  const isDeploymentLink = isDaytonaLink || isCloudFlareLink;

  if (isDeploymentLink) {
    return (
      <Button
        asChild
        variant="default"
        size="sm"
        className={cn(
          "inline-flex items-center gap-2 my-1 h-8 px-3 py-1 text-sm font-medium",
          "bg-gradient-to-r from-purple-900 to-purple-700 hover:from-purple-800 hover:to-purple-600",
          "text-white border-0 rounded-md transition-all duration-200",
          "shadow-md hover:shadow-lg",
          className
        )}
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          Acesse aqui
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    );
  }

  // For regular links, return a normal anchor tag
  return (
    <a
      href={href}
      className="text-primary hover:underline dark:text-blue-400"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}