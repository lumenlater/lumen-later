/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lumenlater/merchant-sdk', '@lumenlater/bnpl-core-client'],
};

module.exports = nextConfig;
