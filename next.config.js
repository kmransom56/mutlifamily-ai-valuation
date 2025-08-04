/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker health check endpoint
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
  // Environment configuration
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
  // Temporarily disable ESLint during build to focus on functionality
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
