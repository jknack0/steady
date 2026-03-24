/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@steady/shared", "@steady/db", "react-native-web"],

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
    resolveExtensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".js", ".json"],
  },

  // Webpack fallback (for builds using --webpack flag)
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
