'use client';

import { useFeatureFlag } from '@/lib/feature-flags';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { enabled: agentPlaygroundEnabled, loading } = useFeatureFlag('custom_agents');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !agentPlaygroundEnabled) {
      router.push('/dashboard');
    }
  }, [loading, agentPlaygroundEnabled, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agentPlaygroundEnabled) {
    return null;
  }

  return <>{children}</>;
}