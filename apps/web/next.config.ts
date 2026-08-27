import type { NextConfig } from 'next';

const scriptSource = process.env.NODE_ENV === 'development' ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const configuredApiOrigin = configuredApiBaseUrl && /^https?:\/\//i.test(configuredApiBaseUrl)
  ? new URL(configuredApiBaseUrl).origin
  : undefined;
const connectSources = ["'self'", 'https:', 'http://localhost:3100', ...(configuredApiOrigin ? [configuredApiOrigin] : [])].join(' ');

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
          { key: 'Content-Security-Policy', value: `default-src 'self'; connect-src ${connectSources}; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src ${scriptSource}` }
        ]
      }
    ];
  }
};

export default nextConfig;
