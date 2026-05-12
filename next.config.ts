import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // MCP clients (Claude Code, Cursor, etc.) prefer connecting to a bare
      // `/mcp` URL rather than `/api/mcp`. This internal rewrite keeps the
      // Next.js route co-located with the other API handlers while exposing
      // the canonical MCP endpoint.
      {
        source: '/mcp',
        destination: '/api/mcp',
      },
    ]
  },
};

export default nextConfig;
