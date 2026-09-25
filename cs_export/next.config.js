/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.export-build',
  output: 'export',
  outputFileTracingRoot: '/',
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  assetPrefix: './',
};

module.exports = nextConfig;
