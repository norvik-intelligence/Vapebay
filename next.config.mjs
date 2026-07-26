/** @type {import('next').NextConfig} */
const nextConfig = {
  // `standalone` emits a self-contained server bundle for the Docker image
  // (~120MB instead of the full node_modules tree). Vercel uses its own
  // serverless packaging and ignores/conflicts with standalone — skip it there.
  output: process.env.VERCEL ? undefined : 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    // Tree-shakes the icon barrel so a page importing 4 icons doesn't pull 1500.
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-dialog'],
  },
  serverExternalPackages: ['better-sqlite3'],
  // The runtime bootstrap reads drizzle/0000_init.sql via fs — file tracing
  // only follows imports, so without this the SQL never reaches the Vercel
  // function bundle and every cold start would fail with "Migration fehlt".
  outputFileTracingIncludes: {
    '/**': ['./drizzle/**/*'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
