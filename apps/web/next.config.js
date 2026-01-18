/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

module.exports = nextConfig;
