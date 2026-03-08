import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack to avoid cache corruption on Windows (SST write failures, ENOENT build-manifest).
  // Use `next dev --turbopack` to re-enable if desired.
  turbopack: false,
};

export default nextConfig;
