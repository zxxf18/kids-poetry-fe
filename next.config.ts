import type { NextConfig } from 'next';

const apiOrigin = process.env.POETRY_API_ORIGIN?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  // Let the production Node handler compress HTML/RSC responses before they
  // reach the public reverse proxy. This is especially useful for the poetry
  // catalogue, whose initial payload contains many text labels.
  compress: true,
  async rewrites() {
    if (!apiOrigin) return [];
    return [
      { source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
