import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isFlagEnabled } from '@/lib/feature-flags';

export const metadata: Metadata = {
  title: 'Create Agent | InventuAI Thanus',
  description: 'Interactive agent playground powered by InventuAI Thanus',
  openGraph: {
    title: 'Agent Playground | InventuAI Thanus',
    description: 'Interactive agent playground powered by InventuAI Thanus',
    type: 'website',
  },
};

export default async function NewAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
  if (!agentPlaygroundEnabled) {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
