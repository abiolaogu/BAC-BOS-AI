/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8094/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
