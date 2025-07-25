/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Enable standalone output for Docker deployment  
  output: 'standalone',
  // Disable telemetry
  telemetry: false,
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
};

module.exports = nextConfig;