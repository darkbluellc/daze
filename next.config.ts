import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // The "Running TypeScript" step is the memory hog in `next build` and can
    // OOM a small build server. We type-check separately (`tsc --noEmit` in
    // dev/CI), so skip it during the production build.
    ignoreBuildErrors: true,
  },
  // node-ical pulls in temporal-polyfill (heavy BigInt use) which breaks when
  // bundled ("h.BigInt is not a function"). Load it natively instead of bundling.
  serverExternalPackages: ["node-ical"],
};

export default nextConfig;
