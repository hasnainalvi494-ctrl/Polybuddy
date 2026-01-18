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
};

module.exports = nextConfig;
