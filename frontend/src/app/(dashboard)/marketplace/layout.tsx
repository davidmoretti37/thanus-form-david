'use client';

import { useFeatureFlag } from '@/lib/feature-flags';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { enabled: marketplaceEnabled, loading } = useFeatureFlag('agent_marketplace');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !marketplaceEnabled) {
      router.push('/dashboard');
    }
  }, [loading, marketplaceEnabled, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!marketplaceEnabled) {
    return null;
  }

  return <>{children}</>;
}