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
      // packages/ui (no framework peer in its own tree) and apps/site (has
      // `next`) resolve @better-auth-ui/* and better-auth to two genuinely
      // different pnpm-installed instances, because better-auth's optional
      // peer on the framework adapter makes pnpm compute a different
      // peer-satisfying instance per consumer. Two instances means two
      // separate `createContext()` calls at runtime — <AuthProvider> from
      // one instance's Context is invisible to useAuth() resolving the
      // other. Aliasing each specifier to itself forces Turbopack to
      // re-resolve it from this app's own node_modules for every importer,
      // regardless of which file (app or package) does the importing.
      resolveAlias: {
        '@': './src',
        '@better-auth-ui/core': '@better-auth-ui/core',
        '@better-auth-ui/react': '@better-auth-ui/react',
        'better-auth': 'better-auth',
      },
    },
  });
};

export default nextConfig;
