//@ts-check

"use strict";

const path = require("path");
const WebpackManifestPlugin =
  require("webpack-manifest-plugin").WebpackManifestPlugin;

const config = [
  {
    name: "webview",
    target: "web",
    entry: "./src/webview/index.tsx",
    output: {
      filename: "[name].bundle.js",
      path: path.resolve(__dirname, "../dist/webview"),
      publicPath: "", // Added for WebView relative paths
    },
    devtool: "source-map",
    resolve: {
      extensions: [".ts", ".js", ".tsx", ".jsx"],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: "asset/resource", // copies images to output
          generator: {
            filename: "assets/[name][ext]", // Webpack generates unique file names
          },
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader", "postcss-loader"],
        },
      ],
    },
    performance: {
      hints: false,
    },
    plugins: [new WebpackManifestPlugin({ publicPath: "" })],
    devServer: {
      compress: true,
      port: 9000,
      hot: true,
      allowedHosts: "all",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
  },
];

module.exports = (env, argv) => {
  for (const configItem of config) {
    configItem.mode = argv.mode;

    if (argv.mode === "production") {
      configItem.devtool = "hidden-source-map";

      configItem.optimization = {
        splitChunks: {
          chunks: "all",
        },
      };
    }
  }

  return config;
};
