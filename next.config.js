/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*', // Proxy to Flask backend
      },
    ];
  },
  // Enable standalone output for Docker deployment  
  output: 'standalone',
  // Disable telemetry
  telemetry: false,
};

module.exports = nextConfig;