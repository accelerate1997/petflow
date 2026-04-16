import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-expect-error - NextConfig types in this version don't properly recognize the eslint property
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
