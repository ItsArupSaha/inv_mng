import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Verification builds can target a separate directory (NEXT_DIST_DIR=.next-prod)
  // so a production build never corrupts the .next cache of a running dev server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
