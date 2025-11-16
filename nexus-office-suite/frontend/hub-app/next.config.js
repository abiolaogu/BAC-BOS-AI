/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  poweredByHeader: false,

  async rewrites() {
    return [
      {
        source: '/api/writer/:path*',
        destination: process.env.NEXT_PUBLIC_WRITER_API_URL + '/:path*'
      },
      {
        source: '/api/sheets/:path*',
        destination: process.env.NEXT_PUBLIC_SHEETS_API_URL + '/:path*'
      },
      {
        source: '/api/slides/:path*',
        destination: process.env.NEXT_PUBLIC_SLIDES_API_URL + '/:path*'
      },
      {
        source: '/api/drive/:path*',
        destination: process.env.NEXT_PUBLIC_DRIVE_API_URL + '/:path*'
      },
      {
        source: '/api/meet/:path*',
        destination: process.env.NEXT_PUBLIC_MEET_API_URL + '/:path*'
      },
      {
        source: '/api/auth/:path*',
        destination: process.env.NEXT_PUBLIC_AUTH_API_URL + '/:path*'
      }
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
