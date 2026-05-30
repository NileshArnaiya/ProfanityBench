/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["fuse.js"],
  },
};

module.exports = nextConfig;
