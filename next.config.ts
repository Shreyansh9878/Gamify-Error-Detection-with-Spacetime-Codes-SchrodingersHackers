import type { NextConfig } from "next";
const config: NextConfig = {
  async rewrites() {
    // Vercel routes to the colocated Python function, never to localhost.
    if (process.env.VERCEL === "1") return [];
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.QUANTUM_API_URL || "http://127.0.0.1:8000"}/api/:path*`,
      },
    ];
  },
};
export default config;
