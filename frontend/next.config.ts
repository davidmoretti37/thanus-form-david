import type { NextConfig } from 'next';

const nextConfig = (): NextConfig => ({
  output: (process.env.NEXT_OUTPUT as 'standalone') || undefined,

  // Ensure ESM packages like mermaid and @iconify/utils are transpiled for Next/Turbopack
  // This fixes resolution issues like "Can't resolve '../customisations/defaults.mjs'"
  transpilePackages: ['mermaid', '@iconify/utils', '@iconify/types'],

  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/ingest/flags',
        destination: 'https://eu.i.posthog.com/flags',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
});

export default nextConfig;
