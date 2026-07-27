import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray package-lock.json in the parent home
  // directory otherwise makes Next guess the wrong root and warn on every run.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
