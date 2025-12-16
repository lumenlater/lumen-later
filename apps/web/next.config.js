/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  transpilePackages: ['@lumenlater/sdk'],
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during production builds
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Handle node modules that don't work in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify'),
        crypto: require.resolve('crypto-browserify'),
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        'sodium-native': false,
        path: false,
        os: false,
      };
      
      // Ignore warnings for modules that try to access Node.js APIs
      config.ignoreWarnings = [
        { module: /node_modules\/sodium-native/ },
        { module: /node_modules\/require-addon/ },
        (warning) => warning.message.includes('Critical dependency'),
      ];
    }
    
    if (!isServer) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }
    
    // Replace sodium-native with a browser-safe alternative
    config.resolve.alias = {
      ...config.resolve.alias,
      'sodium-native$': false,
    };
    
    return config;
  },
};

module.exports = nextConfig;