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
  // Docs content is read with fs at request time. Ensure those files are
  // bundled into the standalone output.
  outputFileTracingIncludes: {
    '/docs': ['./content/**/*'],
    '/docs/[...slug]': ['./content/**/*'],
    '/docs-search': ['./content/**/*'],
  },
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
};

export default nextConfig;
