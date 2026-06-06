/** @type {import('next').NextConfig} */
const pkg = require('./package.json');
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};
module.exports = nextConfig;
