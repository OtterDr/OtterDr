//@ts-check

'use strict';

const path = require('path');
// eslint-disable-next-line @typescript-eslint/naming-convention
const WebpackManifestPlugin = require('webpack-manifest-plugin').WebpackManifestPlugin;

const config = [
  {
    name: 'webview',
    target: 'web',
    entry: './src/webview/index.tsx',
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, '../dist/webview')
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.js', '.tsx', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [{
            loader: 'ts-loader'
          }]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    performance: {
      hints: false
    },
    plugins: [new WebpackManifestPlugin({ publicPath: "" })],
    devServer: {
      compress: true,
      port: 9000,
      hot: true,
      allowedHosts: "all",
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "Access-Control-Allow-Origin": "*",
      }
    }
  }
];

module.exports = (/** @type {any} */ env, /** @type {{ mode: string; }} */ argv) => {
  for (const configItem of config) {
    // @ts-ignore
    configItem.mode = argv.mode;

    if (argv.mode === 'production') {
      configItem.devtool = "hidden-source-map";

      // @ts-ignore
      configItem.optimization = {
        splitChunks: {
          chunks: 'all',
        },
      };
    }
  }

  return config;
};