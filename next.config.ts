import type { NextConfig } from 'next';

const apiOrigin = process.env.POETRY_API_ORIGIN?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  basePath: '/poetry',
  async rewrites() {
    if (!apiOrigin) return [];
    return [
      { source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
