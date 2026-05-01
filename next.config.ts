import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Use standalone output for Docker; Vercel uses its own build pipeline */
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
