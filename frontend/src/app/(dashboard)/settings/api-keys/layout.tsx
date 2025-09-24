import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Keys | Tars',
  description: 'Manage your API keys for programmatic access to Tars',
  openGraph: {
    title: 'API Keys | Tars',
    description: 'Manage your API keys for programmatic access to Tars',
    type: 'website',
  },
};

export default async function APIKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
