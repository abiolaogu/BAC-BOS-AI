/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_CALENDAR_API_URL: process.env.NEXT_PUBLIC_CALENDAR_API_URL || 'http://localhost:8083',
  },
};

module.exports = nextConfig;
