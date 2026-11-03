import type { NextConfig } from "next";

// L'backend dyal Spring Boot (f Docker: smiyt service "backend")
const BACKEND_URL = process.env.BACKEND_URL || "http://backend:6225";

const nextConfig: NextConfig = {
  // Ila dkhlti direct l port 3114 (bla Nginx), Next.js kaydouz /api w /ws l backend
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/ws/:path*", destination: `${BACKEND_URL}/ws/:path*` },
    ];
  },
};

export default nextConfig;