import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for the Docker `runner` stage.
  output: "standalone",
};

export default nextConfig;
