import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained server for the container image.
  output: "standalone",
  // Hey Nav runs inside the customer's boundary; keep the image pipeline local.
  images: { unoptimized: true },
};

export default nextConfig;
