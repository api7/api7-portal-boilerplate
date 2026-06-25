import type { NextConfig } from "next";

const nextConfig = async (): Promise<NextConfig> => {
  const { createMDX } = await import('fumadocs-mdx/next');
  const withMDX = createMDX();

  return withMDX({
    output: 'standalone',
    distDir: '.next',
    reactStrictMode: true,
    transpilePackages: [],
    serverExternalPackages: ['drizzle-orm', 'pg'],
    async rewrites() {
      return [
        {
          source: '/docs.md',
          destination: '/llms.mdx/docs',
        },
        {
          source: '/docs/:path*.md',
          destination: '/llms.mdx/docs/:path*',
        },
      ];
    },
    turbopack: {
      resolveAlias: {
        '@': './src',
      },
    },
  });
};

export default nextConfig;
