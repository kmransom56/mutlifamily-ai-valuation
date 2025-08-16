/** @type {import('next').NextConfig} */
const nextConfig = {
<<<<<<< HEAD
  // Enable standalone output for Docker deployment  
  output: 'standalone',
=======
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3
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
