import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        pino: "pino/browser",
      };

      config.plugins = config.plugins ?? [];
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: ["process"],
        }),
      );
    }

    return config;
  },
};

export default nextConfig;
