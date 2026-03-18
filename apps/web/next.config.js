/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@steady/shared", "@steady/db"],
};

module.exports = nextConfig;
