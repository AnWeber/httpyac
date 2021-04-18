/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check
'use strict';
const fs = require('fs');
const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');


/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
	mode: 'none',

  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: {
      type: 'commonjs2',
    },
  },
  devtool: 'nosources-source-map',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  plugins: [new ESLintPlugin({extensions: ['js', 'ts']})],
  externals: fs.readdirSync("node_modules"),
  optimization: {
    minimize: true,
  }
};
module.exports = config;