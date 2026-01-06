import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Output directory for production builds
  distDir: '.next',
  // Enable React strict mode
  reactStrictMode: true,
  // Transpile packages if needed
  transpilePackages: [],
  serverExternalPackages: ['drizzle-orm', 'pg'],
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
};

export default nextConfig;
