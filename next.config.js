/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker health check endpoint
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
      // Proxy Bull Board admin to local server (requires npm run admin:queues)
      {
        source: '/admin/queues',
        destination: 'http://localhost:9999/admin/queues',
      },
      {
        source: '/admin/queues/:path*',
        destination: 'http://localhost:9999/admin/queues/:path*',
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
