/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@steady/shared", "@steady/db", "react-native-web"],

  async headers() {
    // Portal-specific CSP — tighter than the clinician app because the
    // portal is the highest-risk PHI surface (AC-8, COND-18). Script is
    // restricted to 'self' + Next.js's inline-hashed runtime. Styles allow
    // 'unsafe-inline' for Tailwind JIT + LiveKit's component styles.
    const portalCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Google Fonts + Tailwind JIT inline styles + LiveKit components styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // Connect: own origin + API + LiveKit signaling + WebRTC
      "connect-src 'self' https://*.steadymentalhealth.com wss://*.steadymentalhealth.com https://api.steadymentalhealth.com wss://live-kit.steadymentalhealth.com http://localhost:4000 ws://localhost:4000 ws://localhost:7880 wss://localhost:7880",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      // Global defaults — clinician app + public pages
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
      // Portal — tighter headers, COND-18
      {
        source: "/portal/:path*",
        headers: [
          { key: "Content-Security-Policy", value: portalCsp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(), fullscreen=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Prevent browser + CDN caching of PHI pages
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
    };
    config.resolve.extensions = [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ...(config.resolve.extensions || []),
    ];
    return config;
  },
};

module.exports = nextConfig;
