import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Agent Conversation | Tars',
  description: 'Interactive agent conversation powered by Tars',
  openGraph: {
    title: 'Agent Conversation | Tars',
    description: 'Interactive agent conversation powered by Tars',
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
