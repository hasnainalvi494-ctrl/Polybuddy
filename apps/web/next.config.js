/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: 'https://polybuddy-api-production.up.railway.app',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@polybuddy/analytics"],

  // Image optimization
  images: {
    domains: ['polymarket.com', 'clob.polymarket.com'],
  },

  // Disable static optimization to prevent serialization issues
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // Output standalone for deployment
  output: 'standalone',

  // Webpack configuration to handle missing packages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Disable caching for API routes and dynamic pages
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
