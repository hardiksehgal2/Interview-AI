// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Disables Image Optimization API (required for static exports)
  },
  // distDir: 'out',
  /* config options here */
};

export default nextConfig;
