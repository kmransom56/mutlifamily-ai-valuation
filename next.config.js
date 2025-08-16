/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment  
  output: 'standalone',
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
