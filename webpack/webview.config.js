//@ts-check

'use strict';

const path = require('path');
// eslint-disable-next-line @typescript-eslint/naming-convention
const WebpackManifestPlugin =
  require('webpack-manifest-plugin').WebpackManifestPlugin;

/** @type {(import('webpack').Configuration & { devServer?: import('webpack-dev-server').Configuration })[]} */
const config = [
  {
    name: 'webview',
    target: 'web',
    entry: {
      webview: './src/webview/explorer/index.tsx',
      panel: './src/webview/editor/index.tsx',
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, '../dist/webview'),
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.js', '.tsx', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
            },
          ],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
      ],
    },
    performance: {
      hints: false,
    },
    plugins: [new WebpackManifestPlugin({ publicPath: '' })],
    devServer: {
      compress: true,
      port: 9000,
      hot: true,
      allowedHosts: 'all',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Access-Control-Allow-Origin': '*',
      },
    },
  },
];

/** @type {(env: any, argv: { mode: 'none' | 'development' | 'production' }) => import('webpack').Configuration[]} */
module.exports = (env, argv) => {
  for (const configItem of config) {
    configItem.mode = argv.mode;

    configItem.optimization = {
      splitChunks: false,
    };

    if (argv.mode === 'production') {
      configItem.devtool = 'hidden-source-map';
    }
  }

  return config;
};
