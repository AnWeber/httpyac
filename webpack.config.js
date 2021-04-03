//@ts-check
'use strict';
const fs = require('fs');

const path = require('path');
const webpack = require('webpack');

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
  devtool: process.env.NODE_ENV !== 'production' ? 'eval-source-map' : 'source-map',
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
  externals: fs.readdirSync("node_modules"),
  optimization: {
    minimize: true,
  }
};
module.exports = config;