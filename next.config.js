/** @type {import('next').NextConfig} */
const pkg = require('./package.json');
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version
  }
};
module.exports = nextConfig;
