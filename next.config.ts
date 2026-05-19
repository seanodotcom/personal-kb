import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['100.94.253.73', 'localhost', '127.0.0.1'],
  experimental: {
    serverActions: {
      allowedOrigins: ['100.94.253.73:3000', 'localhost:3000', '127.0.0.1:3000'],
    },
  },
};

export default nextConfig;
