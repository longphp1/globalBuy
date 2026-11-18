import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx", "postgres"],
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
