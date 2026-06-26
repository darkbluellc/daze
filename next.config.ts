import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // The "Running TypeScript" step is the memory hog in `next build` and can
    // OOM a small build server. We type-check separately (`tsc --noEmit` in
    // dev/CI), so skip it during the production build.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
