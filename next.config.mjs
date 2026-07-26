/** @type {import('next').NextConfig} */
const nextConfig = {
  // `standalone` emits a self-contained server bundle — the Docker image ships
  // ~120MB instead of the full node_modules tree, which matters on a 512MB cap.
  output: 'standalone',
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
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
