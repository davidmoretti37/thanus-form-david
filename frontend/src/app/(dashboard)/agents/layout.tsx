import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Agent Conversation | Kortix Tars',
  description: 'Interactive agent conversation powered by Kortix Tars',
  openGraph: {
    title: 'Agent Conversation | Kortix Tars',
    description: 'Interactive agent conversation powered by Kortix Tars',
    type: 'website',
  },
};

export default async function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
