import type { NextConfig } from "next";

// Tools used to live under /dynasty. They now live under /l/[leagueId] so the
// app can hold more than one league. SLEEPER_LEAGUE_ID is kept solely as the
// redirect target for those old URLs.
const legacyLeagueId = process.env.SLEEPER_LEAGUE_ID;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rosteraudit.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
  async redirects() {
    if (!legacyLeagueId) return [];
    return [
      {
        source: "/dynasty",
        destination: `/l/${legacyLeagueId}`,
        permanent: true,
      },
      {
        source: "/dynasty/:path*",
        destination: `/l/${legacyLeagueId}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
